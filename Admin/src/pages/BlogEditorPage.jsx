import { useCallback, useEffect, useRef, useState } from "react";
import {
  LuArrowLeft,
  LuBold,
  LuCode,
  LuHeading1,
  LuHeading2,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuQuote,
  LuRedo2,
  LuStrikethrough,
  LuUnderline,
  LuUndo2,
  LuImage,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuSave,
  LuSend,
  LuFileText,
} from "react-icons/lu";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  createBlog,
  getBlogById,
  updateBlog,
  uploadBlogInlineImage,
} from "../services/adminApi";

const CATEGORIES = ["IT", "English", "Career", "Technology", "Interview Tips", "Resume & Cover Letter", "Salary & Growth", "Remote Work", "Product Updates"];

const ToolbarButton = ({ onClick, active = false, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`rounded-lg border p-2 text-sm transition ${
      active
        ? "border-[#163060] bg-[#163060] text-white"
        : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <div className="h-6 w-px bg-slate-200" />;

export default function BlogEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("Career");
  const [tagsInput, setTagsInput] = useState("");
  const [authorName, setAuthorName] = useState("Admin");
  const [coverPreview, setCoverPreview] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [status, setStatus] = useState("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      ImageExtension.configure({ inline: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder: "Start writing your blog content here...",
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[400px] outline-none px-6 py-5 text-slate-900",
      },
    },
  });

  useEffect(() => {
    if (!isEditing || !id) return;

    const load = async () => {
      try {
        const response = await getBlogById(id);
        const blog = response.data;

        setTitle(blog.title || "");
        setSlug(blog.slug || "");
        setExcerpt(blog.excerpt || "");
        setCategory(blog.category || "Career");
        setTagsInput((blog.tags || []).join(", "));
        setAuthorName(blog.author?.name || "Admin");
        setCoverPreview(blog.coverImage?.url || "");
        setStatus(blog.status || "draft");

        if (editor && blog.content) {
          editor.commands.setContent(blog.content);
        }
      } catch (error) {
        setPageError(error.message || "Failed to load blog");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id, isEditing, editor]);

  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCoverPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleInlineImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("inlineImage", file);
      const response = await uploadBlogInlineImage(formData);

      if (response.success && response.data?.url) {
        editor.chain().focus().setImage({ src: response.data.url }).run();
      }
    } catch (error) {
      setPageError(error.message || "Failed to upload image");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL", previousUrl || "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleSave = async (publishStatus) => {
    if (!title.trim()) {
      setPageError("Blog title is required");
      return;
    }

    if (!editor || editor.isEmpty) {
      setPageError("Blog content is required");
      return;
    }

    setIsSaving(true);
    setPageError("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", editor.getHTML());
      formData.append("excerpt", excerpt.trim());
      formData.append("category", category);
      formData.append("tags", JSON.stringify(tagsInput.split(",").map((t) => t.trim()).filter(Boolean)));
      formData.append("authorName", authorName.trim());
      formData.append("status", publishStatus);

      if (coverFile) {
        formData.append("coverImage", coverFile);
      }

      if (isEditing) {
        await updateBlog({ id, formData });
      } else {
        await createBlog(formData);
      }

      navigate("/admin/blogs");
    } catch (error) {
      setPageError(error.message || "Failed to save blog");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Blog Editor
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            Loading blog...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/blogs"
            className="rounded-2xl border border-slate-200 p-2.5 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <LuArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditing ? "Edit Blog" : "New Blog"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isEditing
                ? "Update the blog content and settings."
                : "Create a new blog article for the candidate portal."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
          >
            <LuSave size={16} />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#163060] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d3f7f] disabled:opacity-50"
          >
            <LuSend size={16} />
            {isEditing ? "Update & Publish" : "Publish"}
          </button>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {pageError}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
        <div className="space-y-5 p-6 md:p-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Blog title"
            className="w-full border-0 bg-transparent p-0 text-3xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#163060]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Author Name
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#163060]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. react, career, jobs"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#163060]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Excerpt / Summary
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              placeholder="A short summary of the blog (optional)"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#163060] resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cover Image
            </label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleCoverSelect}
              className="hidden"
            />
            {coverPreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-slate-200">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="aspect-[16/7] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverPreview("");
                    setCoverFile(null);
                  }}
                  className="absolute right-3 top-3 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow backdrop-blur transition hover:bg-white"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow backdrop-blur transition hover:bg-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex aspect-[16/7] w-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400 transition hover:border-slate-300 hover:bg-slate-100"
              >
                <div className="text-center">
                  <LuImage size={28} className="mx-auto" />
                  <p className="mt-2 font-medium">Click to upload cover image</p>
                  <p className="mt-0.5 text-xs">JPG, PNG, WEBP, or GIF (max 10MB)</p>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Bold"
            >
              <LuBold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Italic"
            >
              <LuItalic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              active={editor?.isActive("underline")}
              title="Underline"
            >
              <LuUnderline size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              active={editor?.isActive("strike")}
              title="Strikethrough"
            >
              <LuStrikethrough size={16} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor?.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <LuHeading1 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <LuHeading2 size={16} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Bullet List"
            >
              <LuList size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              title="Ordered List"
            >
              <LuListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
              title="Blockquote"
            >
              <LuQuote size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              active={editor?.isActive("codeBlock")}
              title="Code Block"
            >
              <LuCode size={16} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign("left").run()}
              active={editor?.isActive({ textAlign: "left" })}
              title="Align Left"
            >
              <LuAlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign("center").run()}
              active={editor?.isActive({ textAlign: "center" })}
              title="Align Center"
            >
              <LuAlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setTextAlign("right").run()}
              active={editor?.isActive({ textAlign: "right" })}
              title="Align Right"
            >
              <LuAlignRight size={16} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={handleAddLink}
              active={editor?.isActive("link")}
              title="Insert Link"
            >
              <LuLink size={16} />
            </ToolbarButton>

            <div className="relative">
              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                active={false}
                title="Insert Image"
              >
                <LuImage size={16} />
              </ToolbarButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleInlineImageUpload}
                className="hidden"
              />
              {isUploadingImage ? (
                <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-lime-400" />
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <ToolbarButton
                onClick={() => editor?.chain().focus().undo().run()}
                title="Undo"
              >
                <LuUndo2 size={16} />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor?.chain().focus().redo().run()}
                title="Redo"
              >
                <LuRedo2 size={16} />
              </ToolbarButton>
            </div>
          </div>

          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
