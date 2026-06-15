import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuBookOpen,
  LuCheck,
  LuEye,
  LuGlobe,
  LuLock,
  LuPenLine,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { Link, useNavigate } from "react-router-dom";
import {
  deleteBlog,
  getBlogs,
  toggleBlogStatus,
} from "../services/adminApi";

const statusStyles = {
  published: "border-lime-300 bg-lime-50 text-lime-800",
  draft: "border-slate-300 bg-slate-100 text-slate-600",
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default function BlogsPage() {
  const navigate = useNavigate();
  const [blogs, setBlogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const loadBlogs = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await getBlogs({
        page,
        limit: 15,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
      });
      setBlogs(response.data || []);
      setPagination(response.pagination || null);
    } catch (error) {
      setPageError(error.message || "Failed to load blogs");
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, categoryFilter, search]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const handleToggleStatus = async (id) => {
    try {
      await toggleBlogStatus(id);
      setBlogs((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: b.status === "published" ? "draft" : "published" }
            : b,
        ),
      );
    } catch (error) {
      setPageError(error.message || "Failed to toggle status");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBlog(id);
      setBlogs((prev) => prev.filter((b) => b.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      setPageError(error.message || "Failed to delete blog");
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blogs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage blog articles for the candidate portal.
          </p>
        </div>
        <Link
          to="/admin/blogs/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#163060] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d3f7f]"
        >
          <LuPlus size={18} />
          New Blog
        </Link>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {pageError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <LuSearch
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search blogs..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#163060]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none transition focus:border-[#163060]"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 outline-none transition focus:border-[#163060]"
        >
          <option value="">All Categories</option>
          <option value="IT">IT</option>
          <option value="English">English</option>
          <option value="Career">Career</option>
          <option value="Technology">Technology</option>
          <option value="Interview Tips">Interview Tips</option>
          <option value="Resume & Cover Letter">Resume & Cover Letter</option>
          <option value="Salary & Growth">Salary & Growth</option>
          <option value="Remote Work">Remote Work</option>
          <option value="Product Updates">Product Updates</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Blogs
            </p>
            <p className="mt-3 text-lg font-semibold text-slate-900">
              Loading blogs...
            </p>
          </div>
        </div>
      ) : blogs.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-16 text-center shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <LuBookOpen size={40} className="mx-auto text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-900">No blogs found</p>
          <p className="mt-2 text-sm text-slate-500">
            {search || statusFilter || categoryFilter
              ? "Try adjusting your filters."
              : "Create your first blog article to get started."}
          </p>
          {!search && !statusFilter && !categoryFilter ? (
            <Link
              to="/admin/blogs/new"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#163060] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d3f7f]"
            >
              <LuPlus size={18} />
              Create Blog
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_25px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(15,23,42,0.08)]"
              >
                {blog.coverImage?.url ? (
                  <div className="aspect-[16/9] overflow-hidden bg-slate-100">
                    <img
                      src={blog.coverImage.url}
                      alt={blog.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center bg-slate-100">
                    <LuBookOpen size={32} className="text-slate-300" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                        statusStyles[blog.status] || statusStyles.draft
                      }`}
                    >
                      {blog.status === "published" ? (
                        <LuGlobe size={11} />
                      ) : (
                        <LuLock size={11} />
                      )}
                      {blog.status}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                      {blog.category}
                    </span>
                    {blog.metadata?.readTimeMinutes ? (
                      <span className="text-[11px] text-slate-400">
                        {blog.metadata.readTimeMinutes} min read
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-3 text-base font-bold leading-snug text-slate-900 line-clamp-2">
                    {blog.title}
                  </h3>

                  {blog.excerpt ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 line-clamp-2">
                      {blog.excerpt}
                    </p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
                    {blog.metadata?.viewCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <LuEye size={13} />
                        {blog.metadata.viewCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                    <Link
                      to={`/admin/blogs/${blog.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[#163060] hover:text-[#163060]"
                    >
                      <LuPenLine size={13} />
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(blog.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                        blog.status === "published"
                          ? "border-amber-200 text-amber-700 hover:border-amber-400"
                          : "border-lime-200 text-lime-700 hover:border-lime-400"
                      }`}
                    >
                      {blog.status === "published" ? (
                        <>
                          <LuX size={13} />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <LuCheck size={13} />
                          Publish
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(blog.id)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-400"
                    >
                      <LuTrash2 size={13} />
                      Delete
                    </button>
                  </div>
                </div>

                {deleteConfirm === blog.id ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm">
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center shadow-lg">
                      <p className="text-sm font-semibold text-rose-800">
                        Delete this blog?
                      </p>
                      <p className="mt-1 text-xs text-rose-600">
                        This action cannot be undone.
                      </p>
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(blog.id)}
                          className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#163060] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-slate-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[#163060] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
