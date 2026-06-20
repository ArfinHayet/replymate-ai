import { Injectable } from '@nestjs/common';
import type { ProductListContext } from '../../../features/chat/product-list-context';
import type { VisibleProductAnalysisResult } from '../ai.types';
import { QueryIntentClassifier } from '../query-intent.classifier';
import {
  applyVisibleProductCriteria,
  buildProductCriteriaLabel,
  buildProductSortLabel,
  hasProductListCriteria,
  rankProductsByCriteria,
  type ProductListCriteria,
} from './visible-product-criteria';

@Injectable()
export class VisibleProductAnalyzerService {
  constructor(private readonly queryIntentClassifier: QueryIntentClassifier) {}

  async analyzeVisibleProductContext(
    query: string,
    productListContext: ProductListContext,
    productListCriteria?: ProductListCriteria,
  ): Promise<VisibleProductAnalysisResult> {
    const products = productListContext.products.filter((p) => p.rawText?.trim());

    if (products.length === 0) {
      return { answer: 'No visible product cards were available to analyze.' };
    }

    const criteria =
      productListCriteria ??
      (await this.classifyVisibleProductCriteria(query, productListContext));

    if (!hasProductListCriteria(criteria)) {
      return {
        answer:
          'I can see the visible product results, but I could not infer a specific filter or ranking from that request.',
        rankedProducts: products.slice(0, 5),
      };
    }

    const filters = criteria.filters ?? [];
    const label = buildProductCriteriaLabel(criteria);
    const filterResult = applyVisibleProductCriteria(products, filters);

    if (filterResult.unavailableLabels.length > 0) {
      return {
        answer: `The visible product cards do not include enough information to apply ${filterResult.unavailableLabels.join(', ')}.`,
        rankedProducts: [],
      };
    }

    if (filterResult.matches.length === 0) {
      return {
        answer: `I could not find any visible products matching ${label}.`,
        rankedProducts: [],
      };
    }

    const rankedBySort = rankProductsByCriteria(filterResult.matches, criteria.sort);
    if (criteria.sort && criteria.sort !== 'none' && rankedBySort.length === 0) {
      return {
        answer: `The visible product cards do not include enough information to rank by ${buildProductSortLabel(criteria.sort)}.`,
        rankedProducts: filterResult.matches.slice(0, 5),
      };
    }

    const rankedProducts = rankedBySort.length > 0 ? rankedBySort : filterResult.matches;
    const singleBest =
      criteria.selection === 'single_best' ||
      Boolean(criteria.sort && criteria.sort !== 'none');

    if (singleBest) {
      return this.buildProductResult(
        label,
        `This visible product best matches ${label}.`,
        rankedProducts[0],
        rankedProducts,
      );
    }

    return this.buildProductGroupResult(
      label,
      `These visible products match ${label}.`,
      rankedProducts,
    );
  }

  private async classifyVisibleProductCriteria(
    query: string,
    productListContext: ProductListContext,
  ): Promise<ProductListCriteria | undefined> {
    const classification = await this.queryIntentClassifier.classifyQueryIntent(
      [],
      query,
      undefined,
      undefined,
      productListContext,
    );

    if (classification.intent !== 'product_list_query') return undefined;
    return classification.productListCriteria;
  }

  private buildProductResult(
    label: string,
    answer: string,
    selectedProduct: ProductListContext['products'][number],
    rankedProducts: ProductListContext['products'],
  ): VisibleProductAnalysisResult {
    return {
      answer,
      selectedProduct,
      rankedProducts: rankedProducts.slice(0, 5),
      dommanipulate: {
        type: 'highlight_product_card' as const,
        productIndex: selectedProduct.index,
        label,
      },
    };
  }

  private buildProductGroupResult(
    label: string,
    answer: string,
    rankedProducts: ProductListContext['products'],
  ): VisibleProductAnalysisResult {
    return {
      answer,
      selectedProduct: rankedProducts[0],
      rankedProducts: rankedProducts.slice(0, 25),
      dommanipulate: {
        type: 'highlight_product_cards' as const,
        productIndexes: rankedProducts.map((p) => p.index),
        label,
      },
    };
  }
}
