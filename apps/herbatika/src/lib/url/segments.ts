import {
  parseAccountChildSegment as parseAccountChildSegmentImplementation,
  parseCheckoutChildSegment as parseCheckoutChildSegmentImplementation,
  parseFlowRootSegment as parseFlowRootSegmentImplementation,
  parseMarket as parseMarketImplementation,
  parseReviewChildSegment as parseReviewChildSegmentImplementation,
  parseRootSegment as parseRootSegmentImplementation,
  parseStaticRootPageSegment as parseStaticRootPageSegmentImplementation,
  parseTypePrefixSegment as parseTypePrefixSegmentImplementation,
} from "./segment-parsers"
import {
  ROUTE_SEGMENT_REGISTRY as ROUTE_SEGMENT_REGISTRY_VALUE,
  SEGMENT_REGISTRY_G1 as SEGMENT_REGISTRY_G1_VALUE,
} from "./segment-registry-data"
import {
  ACCOUNT_CHILD_KEYS as ACCOUNT_CHILD_KEYS_VALUE,
  CHECKOUT_CHILD_KEYS as CHECKOUT_CHILD_KEYS_VALUE,
  FLOW_ROOT_KEYS as FLOW_ROOT_KEYS_VALUE,
  LEGAL_STATIC_ROOT_PAGE_KEYS as LEGAL_STATIC_ROOT_PAGE_KEYS_VALUE,
  MARKETS as MARKETS_VALUE,
  REVIEW_CHILD_KEYS as REVIEW_CHILD_KEYS_VALUE,
  STATIC_ROOT_PAGE_KEYS as STATIC_ROOT_PAGE_KEYS_VALUE,
  TYPE_PREFIX_KEYS as TYPE_PREFIX_KEYS_VALUE,
} from "./segment-registry-keys"

export const ACCOUNT_CHILD_KEYS = ACCOUNT_CHILD_KEYS_VALUE
export const CHECKOUT_CHILD_KEYS = CHECKOUT_CHILD_KEYS_VALUE
export const FLOW_ROOT_KEYS = FLOW_ROOT_KEYS_VALUE
export const LEGAL_STATIC_ROOT_PAGE_KEYS = LEGAL_STATIC_ROOT_PAGE_KEYS_VALUE
export const MARKETS = MARKETS_VALUE
export const REVIEW_CHILD_KEYS = REVIEW_CHILD_KEYS_VALUE
export const ROUTE_SEGMENT_REGISTRY = ROUTE_SEGMENT_REGISTRY_VALUE
export const SEGMENT_REGISTRY_G1 = SEGMENT_REGISTRY_G1_VALUE
export const STATIC_ROOT_PAGE_KEYS = STATIC_ROOT_PAGE_KEYS_VALUE
export const TYPE_PREFIX_KEYS = TYPE_PREFIX_KEYS_VALUE

export const parseAccountChildSegment = parseAccountChildSegmentImplementation
export const parseCheckoutChildSegment = parseCheckoutChildSegmentImplementation
export const parseFlowRootSegment = parseFlowRootSegmentImplementation
export const parseMarket = parseMarketImplementation
export const parseReviewChildSegment = parseReviewChildSegmentImplementation
export const parseRootSegment = parseRootSegmentImplementation
export const parseStaticRootPageSegment =
  parseStaticRootPageSegmentImplementation
export const parseTypePrefixSegment = parseTypePrefixSegmentImplementation
