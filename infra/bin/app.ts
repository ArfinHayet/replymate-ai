#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CompBotStack } from '../lib/comp-bot-stack';

const app = new cdk.App();

// Read deployment environment from CDK context or environment variables
const deployEnv = app.node.tryGetContext('env') ?? process.env.DEPLOY_ENV ?? 'prod';

new CompBotStack(app, `CompBotStack-${deployEnv}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
  deployEnv,
  description: `Comp-bot NestJS backend on Lambda (${deployEnv})`,
});
