import { useCallback, useEffect, useState } from "react";
import { LuArrowRight, LuBookOpen, LuClock, LuFilter } from "react-icons/lu";
import { Link } from "react-router-dom";
import authService from "../../services/authService";

const ALL_CATEGORIES = "All Posts";
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20'/%3E%3C/svg%3E";

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([ALL_CATEGORIES]);
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authService
      .getBlogCategories()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setCategories([ALL_CATEGORIES, ...res.data]);
        }
      })
      .catch(() => {});
  }, []);

  const loadBlogs = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const params = { page, limit: 12 };
      if (activeCategory !== ALL_CATEGORIES) params.category = activeCategory;

      const response = await authService.getPublishedBlogs(params);
      setBlogs(response.data || []);
      setPagination(response.pagination || null);
    } catch (err) {
      setError(err.message || "Failed to load blogs");
    } finally {
      setIsLoading(false);
    }
  }, [page, activeCategory]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory]);

  const featured = blogs.slice(0, 3);
  const remaining = blogs.slice(3);

  return (
    <div style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #163060 0%, #1a3a7a 100%)",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 800,
            color: "#ffffff",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Maven Knowledge Hub
        </h1>
        <p
          style={{
            marginTop: 12,
            fontSize: 16,
            color: "#a0b4d6",
            maxWidth: 560,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.6,
          }}
        >
          Insights, guides, and updates to accelerate your career journey.
        </p>
      </div>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 8,
            marginBottom: 32,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "8px 20px",
                borderRadius: 100,
                border: "none",
                fontSize: 13,
                fontWeight: activeCategory === cat ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
                backgroundColor:
                  activeCategory === cat ? "#163060" : "#ffffff",
                color: activeCategory === cat ? "#ffffff" : "#475569",
                boxShadow:
                  activeCategory === cat
                    ? "0 4px 12px rgba(22,48,96,0.3)"
                    : "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
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
              Loading articles...
            </p>
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#dc2626",
            }}
          >
            <p style={{ fontSize: 16, fontWeight: 600 }}>{error}</p>
          </div>
        ) : blogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <LuBookOpen size={48} color="#94a3b8" />
            <p
              style={{
                marginTop: 16,
                fontSize: 18,
                fontWeight: 600,
                color: "#475569",
              }}
            >
              No articles yet
            </p>
            <p style={{ marginTop: 8, fontSize: 14, color: "#94a3b8" }}>
              Check back soon for new content.
            </p>
          </div>
        ) : (
          <>
            {featured.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 24,
                  marginBottom: 40,
                }}
              >
                {featured.map((blog, i) => (
                  <Link
                    key={blog.id}
                    to={`/blogs/${blog.slug}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      borderRadius: 16,
                      overflow: "hidden",
                      backgroundColor: "#ffffff",
                      boxShadow:
                        "0 4px 20px rgba(15,23,42,0.08)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      gridColumn: i === 0 ? "1 / -1" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 30px rgba(15,23,42,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow =
                        "0 4px 20px rgba(15,23,42,0.08)";
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: i === 0 ? "21/9" : "16/9",
                        overflow: "hidden",
                        backgroundColor: "#f1f5f9",
                      }}
                    >
                      {blog.coverImage?.url ? (
                        <img
                          src={blog.coverImage.url}
                          alt={blog.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.3s",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                          }}
                        >
                          <LuBookOpen size={32} color="#cbd5e1" />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 24, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          marginBottom: 12,
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
                            padding: "4px 10px",
                            borderRadius: 100,
                          }}
                        >
                          {blog.category}
                        </span>
                        {blog.metadata?.readTimeMinutes ? (
                          <span
                            style={{
                              fontSize: 12,
                              color: "#94a3b8",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <LuClock size={12} />
                            {blog.metadata.readTimeMinutes} min read
                          </span>
                        ) : null}
                      </div>
                      <h2
                        style={{
                          fontSize: i === 0 ? 22 : 18,
                          fontWeight: 700,
                          color: "#0f172a",
                          margin: "0 0 8px 0",
                          lineHeight: 1.3,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {blog.title}
                      </h2>
                      {blog.excerpt ? (
                        <p
                          style={{
                            fontSize: 14,
                            color: "#64748b",
                            lineHeight: 1.6,
                            margin: 0,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {blog.excerpt}
                        </p>
                      ) : null}
                      <div
                        style={{
                          marginTop: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            color: "#94a3b8",
                          }}
                        >
                          {formatDate(blog.publishedAt)}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "#163060",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          Read More
                          <LuArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}

            {remaining.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 20,
                }}
              >
                {remaining.map((blog) => (
                  <Link
                    key={blog.id}
                    to={`/blogs/${blog.slug}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      borderRadius: 16,
                      overflow: "hidden",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 2px 12px rgba(15,23,42,0.06)",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 24px rgba(15,23,42,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.boxShadow =
                        "0 2px 12px rgba(15,23,42,0.06)";
                    }}
                  >
                    <div
                      style={{
                        aspectRatio: "16/10",
                        overflow: "hidden",
                        backgroundColor: "#f1f5f9",
                      }}
                    >
                      {blog.coverImage?.url ? (
                        <img
                          src={blog.coverImage.url}
                          alt={blog.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                          }}
                        >
                          <LuBookOpen size={28} color="#cbd5e1" />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 20, flex: 1 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "#163060",
                          backgroundColor: "#eef2ff",
                          padding: "3px 8px",
                          borderRadius: 100,
                        }}
                      >
                        {blog.category}
                      </span>
                      <h3
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: "#0f172a",
                          margin: "10px 0 6px 0",
                          lineHeight: 1.3,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {blog.title}
                      </h3>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#64748b",
                          lineHeight: 1.5,
                          margin: 0,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {blog.excerpt || blog.content?.replace(/<[^>]*>/g, "").slice(0, 120)}
                      </p>
                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 11,
                          color: "#94a3b8",
                        }}
                      >
                        <span>{formatDate(blog.publishedAt)}</span>
                        {blog.metadata?.readTimeMinutes ? (
                          <>
                            <span>·</span>
                            <span>{blog.metadata.readTimeMinutes} min read</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}

            {pagination && pagination.totalPages > 1 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginTop: 40,
                }}
              >
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                    fontSize: 14,
                    fontWeight: 600,
                    color: page <= 1 ? "#cbd5e1" : "#475569",
                    cursor: page <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  Previous
                </button>
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 14,
                    color: "#94a3b8",
                  }}
                >
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    backgroundColor: "#ffffff",
                    fontSize: 14,
                    fontWeight: 600,
                    color:
                      page >= pagination.totalPages ? "#cbd5e1" : "#475569",
                    cursor:
                      page >= pagination.totalPages
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
