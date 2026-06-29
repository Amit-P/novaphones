import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { pb } from '@/integrations/pocketbase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/StarRating';
import { useToast } from '@/hooks/use-toast';

interface ReviewFormProps {
  productId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string;
  };
  onReviewSubmitted: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  productId,
  existingReview,
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit a review.",
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingReview) {
        await pb.collection('reviews').update(existingReview.id, {
          rating,
          comment: comment.trim(),
        });
      } else {
        await pb.collection('reviews').create({
          product_id: productId,
          user: user.id,
          rating,
          comment: comment.trim(),
        });
      }

      toast({
        title: "Review submitted",
        description: existingReview ? "Your review has been updated." : "Thank you for your review!",
      });

      onReviewSubmitted();
      
      if (!existingReview) {
        setRating(0);
        setComment('');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center p-4 bg-muted rounded-lg">
        <p className="text-muted-foreground">Sign in to leave a review</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Your Rating</label>
        <StarRating rating={rating} onRatingChange={setRating} />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Your Review</label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isSubmitting || rating === 0}>
        {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
      </Button>
    </form>
  );
};