import { ArrowRight, Shield, Truck, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ProductCard from '@/components/ProductCard';
import { products } from '@/data/products';
import { Link } from 'react-router-dom';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import heroBannerPremium from '@/assets/hero-banner-premium.jpg';
import heroCarousel1 from '@/assets/hero-carousel-1.jpg';
import heroCarousel2 from '@/assets/hero-carousel-2.jpg';

const Home = () => {
  const featuredProducts = products.slice(0, 3);

  const heroSlides = [
    {
      image: heroBannerPremium,
      title: "Don't settle for less,",
      subtitle: "Get your NovaPhone!",
      description: "Premium smartphones with Cash on Delivery across India"
    },
    {
      image: heroCarousel1,
      title: "Experience Innovation,",
      subtitle: "Own the Latest NovaPhone",
      description: "Premium quality devices with warranty and support"
    },
    {
      image: heroCarousel2,
      title: "Upgrade Your Lifestyle,",
      subtitle: "Choose Excellence",
      description: "Best deals on premium phones delivered to your doorstep"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Carousel Section */}
      <section className="relative h-[600px] overflow-hidden">
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 4000,
            }),
          ]}
          className="w-full h-full"
        >
          <CarouselContent className="h-[600px]">
            {heroSlides.map((slide, index) => (
              <CarouselItem key={index} className="relative h-[600px]">
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${slide.image})` }}
                >
                  <div className="absolute inset-0 bg-black/40" />
                </div>
                
                <div className="relative z-10 h-full flex items-center justify-center text-center text-white max-w-4xl mx-auto px-4">
                  <div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                      {slide.title}
                      <span className="block text-primary-foreground">{slide.subtitle}</span>
                    </h1>
                    <p className="text-xl md:text-2xl mb-8 text-white/90">
                      {slide.description}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6">
                        <Link to="/mobiles">
                          Shop Now <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 bg-white/10 border-white/30 text-white hover:bg-white/20">
                        <Link to="/mobiles">
                          View Collection
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4" />
          <CarouselNext className="right-4" />
        </Carousel>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gradient-surface">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Cash on Delivery</h3>
                <p className="text-muted-foreground">
                  Pay when you receive. No advance payment required across India
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">100% Authentic</h3>
                <p className="text-muted-foreground">
                  Genuine products with official warranty
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-none shadow-lg">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Headphones className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">24/7 Support</h3>
                <p className="text-muted-foreground">
                  Dedicated customer support for all your queries
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Phones</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover the latest NovaPhone models with amazing features and competitive prices
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg" variant="outline" className="px-8">
              <Link to="/mobiles">
                View All Products <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-premium text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Your NovaPhone?
          </h2>
          <p className="text-xl mb-8 text-white/90">
            Browse our collection and order with confidence
          </p>
          <Button asChild size="lg" className="bg-white text-premium hover:bg-white/90 px-8">
            <Link to="/mobiles">
              Start Shopping
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-muted">
        <div className="container text-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} NovaMobiles. All rights reserved. Developed by Amit Patil.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;