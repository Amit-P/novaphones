import React, { useEffect, useState } from 'react';
import { pb } from '@/integrations/pocketbase/client';
import { StarRating } from '@/components/StarRating';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created: string;
}

interface ReviewsListProps {
  productId: string;
  refreshTrigger?: number;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ productId, refreshTrigger }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const data = await pb.collection('public_reviews').getFullList({
        filter: pb.filter('product_id = {:pid}', { pid: productId }),
        sort: '-created',
        fields: 'id,rating,comment,created',
      });

      setReviews(data as unknown as Review[]);

      if (data.length > 0) {
        const avg = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
        setTotalReviews(data.length);
      } else {
        setAverageRating(0);
        setTotalReviews(0);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [productId, refreshTrigger]);

  if (loading) {
    return <div className="animate-pulse">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      {totalReviews > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <StarRating rating={averageRating} readonly />
            <span className="font-semibold">{averageRating}</span>
          </div>
          <span className="text-muted-foreground">
            Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      R
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        Verified Buyer
                      </span>
                      <StarRating rating={review.rating} readonly size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {formatDistanceToNow(new Date(review.created), { addSuffix: true })}
                    </p>
                    {review.comment && (
                      <p className="text-sm">{review.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};