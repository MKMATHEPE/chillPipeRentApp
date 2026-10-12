export const quickReviews: Record<number, string[]> = {
  1: ['Poor communication', 'Long wait', 'Equipment issues', 'Not clean enough', 'Booking difficulties', 'Disappointing experience'],
  2: ['Slow responses', 'Timing could improve', 'Equipment needs attention', 'Instructions unclear', 'Not great value', 'Below expectations'],
  3: ['Okay overall', 'Service was average', 'Equipment was fine', 'Some delays', 'Room for improvement', 'Fair value'],
  4: ['Good service', 'Easy booking', 'Clean equipment', 'Friendly team', 'Good communication', 'Good value'],
  5: ['Excellent service', 'Seamless booking', 'Spotless equipment', 'Right on time', 'Helpful team', 'Worth every rand', 'Exceeded expectations', 'Would book again'],
};
export type BookingReview = { rating: number; tags: string[]; comment: string; submittedAt: number };
export function validReview(body: any): boolean {
  return !!body && Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5 &&
    Array.isArray(body.tags) && body.tags.length <= 8 && new Set(body.tags).size === body.tags.length &&
    body.tags.every((tag: unknown) => typeof tag === 'string' && quickReviews[body.rating].includes(tag)) &&
    typeof body.comment === 'string' && body.comment.length <= 1000;
}
