import { useState, useEffect } from 'react';
import { pb } from '@/integrations/pocketbase/client';

interface ProductRating {
  productId: string;
  averageRating: number;
  totalReviews: number;
}

export const useProductRatings = (productIds: string[]) => {
  const [ratings, setRatings] = useState<Record<string, ProductRating>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      if (productIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const data = await pb.collection('public_reviews').getFullList({
          filter: productIds
            .map((id) => pb.filter('product_id = {:pid}', { pid: id }))
            .join(' || '),
          fields: 'product_id,rating',
        });

        // Group by product and calculate averages
        const ratingsMap: Record<string, ProductRating> = {};
        
        productIds.forEach(productId => {
          const productReviews = data?.filter(review => review.product_id === productId) || [];
          
          if (productReviews.length > 0) {
            const average = productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length;
            ratingsMap[productId] = {
              productId,
              averageRating: Math.round(average * 10) / 10,
              totalReviews: productReviews.length
            };
          } else {
            ratingsMap[productId] = {
              productId,
              averageRating: 0,
              totalReviews: 0
            };
          }
        });

        setRatings(ratingsMap);
      } catch (error) {
        console.error('Error fetching ratings:', error);
        // Set default zero ratings for all products on error
        const defaultRatings: Record<string, ProductRating> = {};
        productIds.forEach(productId => {
          defaultRatings[productId] = {
            productId,
            averageRating: 0,
            totalReviews: 0
          };
        });
        setRatings(defaultRatings);
      } finally {
        setLoading(false);
      }
    };

    fetchRatings();
  }, [productIds.join(',')]);

  return { ratings, loading };
};

export const useProductRating = (productId: string) => {
  const [rating, setRating] = useState<ProductRating>({
    productId,
    averageRating: 0,
    totalReviews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        const data = await pb.collection('public_reviews').getFullList({
          filter: pb.filter('product_id = {:pid}', { pid: productId }),
          fields: 'rating',
        });

        if (data && data.length > 0) {
          const average = data.reduce((sum, review) => sum + review.rating, 0) / data.length;
          setRating({
            productId,
            averageRating: Math.round(average * 10) / 10,
            totalReviews: data.length
          });
        } else {
          setRating({
            productId,
            averageRating: 0,
            totalReviews: 0
          });
        }
      } catch (error) {
        console.error('Error fetching rating:', error);
        setRating({
          productId,
          averageRating: 0,
          totalReviews: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRating();
  }, [productId]);

  return { rating, loading };
};