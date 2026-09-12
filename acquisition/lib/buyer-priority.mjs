// Revenue-first priority view for unpaid B2B buyers.
//
// This module never creates evidence. It only ranks the highest evidence-backed state
// already present in the Buyer Reaction Ledger and excludes buyers with proven payment.

import { revenueDistance, summarizeBuyerReactions } from './buyer-reaction.mjs';

const QUALIFIED_DISTANCE = revenueDistance('qualified_action');

export function prePaymentBuyerPriority(ledger) {
  const summary = summarizeBuyerReactions(ledger);
  const buyers = summary.priority_buyers
    .filter((buyer) => buyer.highest_stage !== 'payment_evidence')
    .filter((buyer) => buyer.revenue_distance <= QUALIFIED_DISTANCE)
    .map((buyer, index) => ({
      priority_rank: index + 1,
      ...buyer,
      recommended_next_stage: buyer.next_stage,
      priority_reason: buyer.highest_stage === 'contract'
        ? 'CONTRACT_NEEDS_PAYMENT'
        : buyer.highest_stage === 'checkout'
          ? 'CHECKOUT_NEEDS_CONTRACT_OR_PAYMENT'
          : 'QUALIFIED_ACTION_NEEDS_CHECKOUT'
    }));

  return {
    version: summary.version,
    unpaid_qualified_buyers: buyers.length,
    nearest_revenue_distance: buyers[0]?.revenue_distance ?? null,
    buyers
  };
}
