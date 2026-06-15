import { useCallback, useEffect, useState } from "react";
import { LuArrowLeft, LuCalendar, LuClock } from "react-icons/lu";
import { Link, useParams } from "react-router-dom";
import authService from "../../services/authService";

export default function BlogArticle() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBlog = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await authService.getBlogBySlug(slug);
      if (response.success) {
        setBlog(response.data);
      } else {
        setError("Blog not found");
      }
    } catch (err) {
      setError(err.message || "Failed to load blog article");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadBlog();
  }, [loadBlog]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #e2e8f0",
              borderTopColor: "#163060",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto",
            }}
          />
          <p style={{ marginTop: 16, color: "#64748b", fontSize: 14 }}>
            Loading article...
          </p>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <p
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: "#e2e8f0",
              margin: 0,
            }}
          >
            404
          </p>
          <p
            style={{
              marginTop: 8,
              fontSize: 18,
              fontWeight: 600,
              color: "#475569",
            }}
          >
            {error || "Article not found"}
          </p>
          <Link
            to="/blogs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 20,
              padding: "10px 24px",
              borderRadius: 12,
              backgroundColor: "#163060",
              color: "#ffffff",
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <LuArrowLeft size={16} />
            Back to Blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <Link
        to="/blogs"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "16px 24px",
          fontSize: 13,
          fontWeight: 600,
          color: "#163060",
          textDecoration: "none",
        }}
      >
        <LuArrowLeft size={16} />
        Back to all articles
      </Link>

      <article
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "0 24px 64px",
        }}
      >
        <div
          style={{
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#163060",
                backgroundColor: "#eef2ff",
                padding: "4px 12px",
                borderRadius: 100,
              }}
            >
              {blog.category}
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 4vw, 40px)",
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.2,
              margin: "0 0 16px 0",
              letterSpacing: "-0.02em",
            }}
          >
            {blog.title}
          </h1>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              fontSize: 13,
              color: "#94a3b8",
              alignItems: "center",
            }}
          >
            {blog.publishedAt ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <LuCalendar size={14} />
                {new Date(blog.publishedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            ) : null}
            {blog.metadata?.readTimeMinutes ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <LuClock size={14} />
                {blog.metadata.readTimeMinutes} min read
              </span>
            ) : null}
          </div>

          {blog.tags && blog.tags.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 16,
              }}
            >
              {blog.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    backgroundColor: "#f1f5f9",
                    padding: "3px 10px",
                    borderRadius: 100,
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {blog.coverImage?.url ? (
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 32,
              aspectRatio: "16/9",
              backgroundColor: "#f1f5f9",
            }}
          >
            <img
              src={blog.coverImage.url}
              alt={blog.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ) : null}

        {blog.excerpt ? (
          <p
            style={{
              fontSize: 16,
              color: "#475569",
              lineHeight: 1.7,
              margin: "0 0 24px 0",
              fontStyle: "italic",
              borderLeft: "3px solid #163060",
              paddingLeft: 16,
            }}
          >
            {blog.excerpt}
          </p>
        ) : null}

        <div
          style={{
            fontSize: 16,
            color: "#334155",
            lineHeight: 1.8,
          }}
          dangerouslySetInnerHTML={{ __html: blog.content || "" }}
        />
      </article>
    </div>
  );
}
