import { useParams, Link } from 'react-router-dom';
import { Calendar, User, ChevronRight, Share2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BlogCard from '@/components/BlogCard';
import { blogPosts, products } from '@/lib/data';

export default function BlogDetail() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Artikel tidak ditemukan</h1>
          <Link to="/blog">
            <Button>Kembali ke Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const relatedPosts = blogPosts
    .filter((p) => p.category === post.category && p.id !== post.id)
    .slice(0, 3);

  const relatedProducts = products.slice(0, 3);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.excerpt,
        url: window.location.href
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="text-gray-600 hover:text-green-700">
              Beranda
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <Link to="/blog" className="text-gray-600 hover:text-green-700">
              Blog
            </Link>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-900 font-medium line-clamp-1">{post.title}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link to="/blog">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Blog
            </Button>
          </Link>

          {/* Article Header */}
          <article className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <img
              src={post.imageUrl}
              alt={post.title}
              className="w-full h-96 object-cover"
            />
            
            <div className="p-8">
              <Badge className="mb-4">{post.category}</Badge>
              
              <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
              
              <div className="flex items-center space-x-6 text-gray-600 mb-6">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>{post.author}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Bagikan
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <Separator className="my-6" />

              {/* Article Content */}
              <div className="prose prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
              </div>

              <Separator className="my-8" />

              {/* Related Products */}
              <div className="bg-green-50 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4">Produk Terkait</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {relatedProducts.map((product) => (
                    <Link
                      key={product.id}
                      to={`/produk/${product.slug}`}
                      className="bg-white rounded-lg p-4 hover:shadow-md transition"
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                      <h4 className="font-semibold text-sm mb-2 line-clamp-2">
                        {product.name}
                      </h4>
                      <p className="text-green-700 font-bold">
                        Rp {(product.discountPrice || product.price).toLocaleString('id-ID')}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </article>

          {/* Related Articles */}
          {relatedPosts.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">Artikel Terkait</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <BlogCard key={relatedPost.id} post={relatedPost} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}