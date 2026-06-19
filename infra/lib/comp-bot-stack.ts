import * as path from 'path';
import * as fs from 'fs';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CompBotStackProps extends cdk.StackProps {
  /** Deployment environment label, e.g. 'prod' | 'staging' */
  deployEnv: string;
}

export class CompBotStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CompBotStackProps) {
    super(scope, id, props);

    const { deployEnv } = props;
    const backendDir = path.join(__dirname, '../../backend');

    // ── Validate the backend lambda staging bundle exists ────────────────────
    //
    // Before running cdk deploy, deploy.sh stages a production-ready bundle at
    // backend/.lambda-build/ containing only dist/ + node_modules (prod only).
    //
    // If this directory is missing, tell the developer to run deploy.sh first.
    const stagingDir = path.join(backendDir, '.lambda-build');
    if (!fs.existsSync(stagingDir) || !fs.existsSync(path.join(stagingDir, 'dist'))) {
      throw new Error(
        `[CDK] Lambda staging bundle not found at ${stagingDir}.\n\n` +
        `Run this first:\n  ./deploy.sh --package-only\n\nor the full deploy:\n  ./deploy.sh\n`,
      );
    }

    // ── CloudWatch log group ─────────────────────────────────────────────────
    const logGroup = new logs.LogGroup(this, 'BackendLogs', {
      logGroupName: `/comp-bot/${deployEnv}/backend`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── Lambda execution role ────────────────────────────────────────────────
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    // ── Environment variables ────────────────────────────────────────────────
    // Load from backend/.env.lambda (not committed). See .env.lambda.example.
    const envVars = loadEnvFile(path.join(backendDir, '.env.lambda'));

    // ── Lambda function ──────────────────────────────────────────────────────
    // Code.fromAsset zips the pre-built staging dir — no Docker, no bundling.
    // The staging dir is produced by deploy.sh --package-only and contains:
    //   .lambda-build/
    //     dist/          ← compiled NestJS output (nest build)
    //     node_modules/  ← production dependencies only (npm ci --omit=dev)
    //     package.json
    const backendFn = new lambda.Function(this, 'BackendFunction', {
      functionName: `comp-bot-backend-${deployEnv}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64, // Graviton2: cheaper + faster than x86
      handler: 'dist/lambda.handler',           // ← compiled src/lambda.ts
      code: lambda.Code.fromAsset(stagingDir),  // zips the pre-built dir as-is

      // ── Runtime config ───────────────────────────────────────────────────
      memorySize: 1536,                        // 1.5 GB — PDF processing needs headroom
      timeout: cdk.Duration.seconds(300),      // 5 min — generous for PDF ingestion
      environment: {
        NODE_ENV: 'production',
        ...envVars,
      },

      role: lambdaRole,
      logGroup,
    });

    // ── API Gateway HTTP API ─────────────────────────────────────────────────
    const httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `comp-bot-api-${deployEnv}`,
      description: `Comp-bot backend API (${deployEnv})`,
      corsPreflight: {
        // Fine-grained CORS is handled by NestJS; API GW passes OPTIONS through.
        allowHeaders: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: cdk.Duration.days(1),
      },
    });

    // Catch-all proxy → NestJS router handles all paths
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new apigatewayv2integrations.HttpLambdaIntegration(
        'BackendIntegration',
        backendFn,
        { payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0 },
      ),
    });

    // Root path
    httpApi.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new apigatewayv2integrations.HttpLambdaIntegration(
        'BackendRootIntegration',
        backendFn,
        { payloadFormatVersion: apigatewayv2.PayloadFormatVersion.VERSION_2_0 },
      ),
    });

    // ── Stack outputs ─────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ApiUrl', {
      description: 'API Gateway endpoint — set as VITE_API_URL in your frontend',
      value: httpApi.apiEndpoint,
      exportName: `CompBotApiUrl-${deployEnv}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      description: 'Lambda function name',
      value: backendFn.functionName,
    });

    new cdk.CfnOutput(this, 'LambdaArn', {
      description: 'Lambda function ARN',
      value: backendFn.functionArn,
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      description: 'CloudWatch log group',
      value: logGroup.logGroupName,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses backend/.env.lambda and returns key-value pairs for Lambda env vars.
 * Skips blank lines and comments (#). Strips surrounding quotes from values.
 */
function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    console.warn(
      `[CDK] Warning: ${filePath} not found.\n` +
      `Lambda will have no environment variables.\n` +
      `Run: cp backend/.env.lambda.example backend/.env.lambda`,
    );
    return {};
  }

  const result: Record<string, string> = {};
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

    if (key) result[key] = val;
  }

  return result;
}
