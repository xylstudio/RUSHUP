WITH ranked_rating_feedback AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, customer_id, feedback_type
      ORDER BY created_at ASC, id ASC
    ) AS rating_rank
  FROM public.customer_order_feedback
  WHERE feedback_type = 'rating'
)
DELETE FROM public.customer_order_feedback feedback
USING ranked_rating_feedback ranked
WHERE feedback.id = ranked.id
  AND ranked.rating_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_order_feedback_unique_rating_once
  ON public.customer_order_feedback(order_id, customer_id, feedback_type)
  WHERE feedback_type = 'rating';