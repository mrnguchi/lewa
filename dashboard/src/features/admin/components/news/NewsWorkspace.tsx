"use client";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Newspaper,
  Plus,
  UploadCloud,
  X,
} from "lucide-react";

import {
  ADMIN_NEWS_CATEGORIES,
  AdminNewsArticle,
  AdminNewsCategory,
  createAdminNews,
  getAdminNews,
  uploadAdminNewsPoster,
} from "@/lib/admin-api";
import { cn } from "@/lib/utils";
import { CustomDropdown } from "@/features/admin/components/ui/CustomDropdown";
import { StatusPill } from "@/features/admin/components/ui/AdminPrimitives";
import { DropdownOption } from "@/features/admin/types";
import { formatShortDate } from "@/features/admin/utils/formatters";

const NEWS_PAGE_SIZE = 8;
const NEWS_FETCH_LIMIT = NEWS_PAGE_SIZE + 1;
const NEWS_CATEGORY_FILTERS = ["All", ...ADMIN_NEWS_CATEGORIES] as const;

type NewsFormState = {
  title: string;
  intro: string;
  description: string;
  category: AdminNewsCategory;
  publishedAt: string;
};

type NewsFormErrors = Partial<Record<keyof NewsFormState | "poster", string>>;
type NewsCategoryFilter = (typeof NEWS_CATEGORY_FILTERS)[number];

const INITIAL_NEWS_FORM: NewsFormState = {
  title: "",
  intro: "",
  description: "",
  category: "Tech",
  publishedAt: "",
};

const categoryOptions: DropdownOption[] = ADMIN_NEWS_CATEGORIES.map(
  (category) => ({
    value: category,
    label: category,
  }),
);

// I fetch one extra item per request so the UI can know whether another page exists.
function normalizeNewsPage(news: AdminNewsArticle[]) {
  return {
    articles: news.slice(0, NEWS_PAGE_SIZE),
    hasMore: news.length > NEWS_PAGE_SIZE,
  };
}

function getNewsStatusLabel(article: AdminNewsArticle) {
  const publishedAtTime = new Date(article.published_at).getTime();
  const createdAtTime = new Date(article.created_at).getTime();

  if (Number.isNaN(publishedAtTime) || Number.isNaN(createdAtTime)) {
    return "Published";
  }

  return publishedAtTime - createdAtTime > 60_000 ? "Scheduled" : "Published";
}

export function NewsWorkspace({
  isComposerOpen,
  onCloseComposer,
  token,
}: {
  isComposerOpen: boolean;
  onCloseComposer: () => void;
  token: string;
}) {
  const [articles, setArticles] = useState<AdminNewsArticle[]>([]);
  const [selectedArticle, setSelectedArticle] =
    useState<AdminNewsArticle | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formState, setFormState] = useState<NewsFormState>(INITIAL_NEWS_FORM);
  const [formErrors, setFormErrors] = useState<NewsFormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreviewUrl, setPosterPreviewUrl] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<NewsCategoryFilter>("All");

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const news = await getAdminNews(token, {
        ...(selectedCategory === "All" ? {} : { category: selectedCategory }),
        limit: NEWS_FETCH_LIMIT,
        offset: 0,
      });
      const normalizedPage = normalizeNewsPage(news);

      setArticles(normalizedPage.articles);
      setHasMore(normalizedPage.hasMore);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load news");
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadFirstPage();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadFirstPage]);

  const loadMoreNews = async () => {
    setIsLoadingMore(true);
    setLoadError("");

    try {
      const news = await getAdminNews(token, {
        ...(selectedCategory === "All" ? {} : { category: selectedCategory }),
        limit: NEWS_FETCH_LIMIT,
        offset: articles.length,
      });
      const normalizedPage = normalizeNewsPage(news);

      setArticles((currentArticles) => [
        ...currentArticles,
        ...normalizedPage.articles,
      ]);
      setHasMore(normalizedPage.hasMore);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load more news");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const resetComposer = () => {
    setFormState(INITIAL_NEWS_FORM);
    setFormErrors({});
    setSubmitError("");
    setPosterFile(null);
    setPosterPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return "";
    });
  };

  const updateFormField = <TField extends keyof NewsFormState>(
    field: TField,
    value: NewsFormState[TField],
  ) => {
    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [field]: "",
    }));
  };

  const validateNewsForm = () => {
    const nextErrors: NewsFormErrors = {};

    if (!formState.title.trim()) {
      nextErrors.title = "Enter a news title.";
    }

    if (!formState.intro.trim()) {
      nextErrors.intro = "Enter a short intro.";
    }

    if (!formState.description.trim()) {
      nextErrors.description = "Enter the full article details.";
    }

    if (!posterFile) {
      nextErrors.poster = "Select a news poster image.";
    }

    setFormErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const submitNews = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateNewsForm() || !posterFile) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const imageUrl = await uploadAdminNewsPoster(token, posterFile);

      await createAdminNews(token, {
        title: formState.title.trim(),
        intro: formState.intro.trim(),
        description: formState.description.trim(),
        category: formState.category,
        image_url: imageUrl,
        published_at: formState.publishedAt
          ? new Date(formState.publishedAt).toISOString()
          : undefined,
      });
      resetComposer();
      onCloseComposer();
      await loadFirstPage();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to add news");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePosterChange = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormErrors((currentErrors) => ({
        ...currentErrors,
        poster: "Select a valid image file.",
      }));
      return;
    }

    setPosterFile(file);
    setFormErrors((currentErrors) => ({
      ...currentErrors,
      poster: "",
    }));
    setPosterPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return URL.createObjectURL(file);
    });
  };

  const clearPoster = () => {
    setPosterFile(null);
    setPosterPreviewUrl((currentPreviewUrl) => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }

      return "";
    });
  };

  const closeComposer = () => {
    if (!isSubmitting) {
      resetComposer();
      onCloseComposer();
    }
  };

  return (
    <section className="mt-5 space-y-5">
      <article className="dashboard-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold">News articles</h2>
            <p className="mt-1 text-sm leading-6 text-text-body">
              Campus updates published to the Lewa mobile app.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {NEWS_CATEGORY_FILTERS.map((category) => (
              <button
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  selectedCategory === category
                    ? "bg-text-primary text-white shadow-[0_10px_22px_rgba(31,41,51,0.12)]"
                    : "cursor-pointer bg-background text-text-body hover:bg-primary-light hover:text-primary-dark",
                )}
                key={category}
                onClick={() => setSelectedCategory(category)}
                type="button"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </article>

      {loadError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {isLoading ? (
        <div className="dashboard-card flex min-h-[24rem] items-center justify-center text-sm text-text-body">
          <LoaderCircle className="mr-2 animate-spin" size={18} />
          Loading news articles
        </div>
      ) : articles.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {articles.map((article) => (
              <NewsCard
                article={article}
                key={article.id}
                onOpen={() => setSelectedArticle(article)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary-light px-4 text-sm font-semibold text-primary-dark transition hover:-translate-y-0.5 hover:bg-[#d8ecdf] hover:shadow-[0_12px_26px_rgba(22,120,70,0.12)] disabled:cursor-not-allowed disabled:opacity-65"
                disabled={isLoadingMore}
                onClick={() => void loadMoreNews()}
                type="button"
              >
                {isLoadingMore && (
                  <LoaderCircle className="animate-spin" size={16} />
                )}
                Load more news
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="dashboard-card flex min-h-[24rem] items-center justify-center px-5 py-12 text-center">
          <div className="max-w-sm">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary-light text-primary">
              <Newspaper aria-hidden="true" size={22} />
            </div>
            <h3 className="mt-4 text-base font-semibold">No news articles yet</h3>
            <p className="mt-2 text-sm leading-6 text-text-body">
              {selectedCategory === "All"
                ? "Published and scheduled campus news will appear here after admins add the first article."
                : `${selectedCategory} articles will appear here after admins publish one in this category.`}
            </p>
          </div>
        </div>
      )}

      {selectedArticle && (
        <NewsDetailsModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}

      {isComposerOpen && (
        <AddNewsModal
          errors={formErrors}
          formState={formState}
          isSubmitting={isSubmitting}
          onChange={updateFormField}
          onClose={closeComposer}
          onClearPoster={clearPoster}
          onPosterChange={handlePosterChange}
          onSubmit={submitNews}
          posterFile={posterFile}
          posterPreviewUrl={posterPreviewUrl}
          submitError={submitError}
        />
      )}
    </section>
  );
}

function NewsCard({
  article,
  onOpen,
}: {
  article: AdminNewsArticle;
  onOpen: () => void;
}) {
  return (
    <button
      className="dashboard-card group flex min-h-[22rem] cursor-pointer flex-col overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-[0_24px_58px_rgba(31,41,51,0.14)] focus:outline-none focus:ring-2 focus:ring-primary/20"
      onClick={onOpen}
      type="button"
    >
      <span className="relative block aspect-[16/10] overflow-hidden bg-background">
        <span
          aria-label={`${article.title} poster`}
          className="block h-full w-full bg-cover bg-center transition duration-300 group-hover:scale-[1.035]"
          role="img"
          style={{
            backgroundImage: `url(${article.image_url})`,
          }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-primary-dark shadow-sm">
          {article.category}
        </span>
      </span>

      <span className="flex min-h-0 flex-1 flex-col p-4">
        <span className="flex items-center justify-between gap-3 text-xs text-text-body">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" size={14} />
            {formatShortDate(article.published_at)}
          </span>
          <StatusPill label={getNewsStatusLabel(article)} />
        </span>

        <span className="mt-3 line-clamp-2 text-base font-semibold leading-6">
          {article.title}
        </span>
        <span className="mt-2 line-clamp-3 text-sm leading-6 text-text-body">
          {article.intro}
        </span>

        <span className="mt-auto flex items-center justify-between pt-5 text-xs font-semibold text-primary-dark">
          <span>Lewa News</span>
          <span className="inline-flex items-center gap-1">
            Details
            <ChevronRight aria-hidden="true" size={14} />
          </span>
        </span>
      </span>
    </button>
  );
}

function NewsDetailsModal({
  article,
  onClose,
}: {
  article: AdminNewsArticle;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card flex max-h-[min(56rem,calc(100vh-1.5rem))] w-full max-w-4xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-primary-dark">
              {article.category}
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-7">
              {article.title}
            </h2>
            <p className="mt-1 text-xs text-text-body">
              Published {formatShortDate(article.published_at)}
            </p>
          </div>
          <button
            aria-label="Close news details"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 pb-5">
          <div
            aria-label={`${article.title} poster`}
            className="h-[min(34rem,62vh)] overflow-hidden rounded-lg bg-background bg-contain bg-center bg-no-repeat"
            role="img"
            style={{
              backgroundImage: `url(${article.image_url})`,
            }}
          />

          <div className="mt-5 rounded-lg bg-background p-4">
            <p className="text-sm font-semibold">Intro</p>
            <p className="mt-2 text-sm leading-6 text-text-body">
              {article.intro}
            </p>
          </div>

          <div className="mt-4 text-sm leading-7 text-text-body">
            {article.description.split("\n").map((paragraph, index) => (
              <p className="mt-3 first:mt-0" key={`${article.id}-${index}`}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}

function AddNewsModal({
  errors,
  formState,
  isSubmitting,
  onChange,
  onClose,
  onClearPoster,
  onPosterChange,
  onSubmit,
  posterFile,
  posterPreviewUrl,
  submitError,
}: {
  errors: NewsFormErrors;
  formState: NewsFormState;
  isSubmitting: boolean;
  onChange: <TField extends keyof NewsFormState>(
    field: TField,
    value: NewsFormState[TField],
  ) => void;
  onClose: () => void;
  onClearPoster: () => void;
  onPosterChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  posterFile: File | null;
  posterPreviewUrl: string;
  submitError: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/35 px-4 py-6 backdrop-blur-sm">
      <article className="dashboard-card flex max-h-[min(54rem,calc(100vh-1.5rem))] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-text-primary text-white">
              <Plus aria-hidden="true" size={20} />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Add news</h2>
            <p className="mt-1 text-sm leading-6 text-text-body">
              Publish a campus article to the mobile news feed.
            </p>
          </div>
          <button
            aria-label="Close add news"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form className="min-h-0 overflow-y-auto px-5 pb-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldShell error={errors.title} label="Title">
              <input
                className={fieldClassName(errors.title)}
                onChange={(event) => onChange("title", event.target.value)}
                placeholder="Article title"
                type="text"
                value={formState.title}
              />
            </FieldShell>

            <CustomDropdown
              label="Category"
              onChange={(value) =>
                onChange("category", value as AdminNewsCategory)
              }
              options={categoryOptions}
              placeholder="Select category"
              value={formState.category}
            />

            <FieldShell className="sm:col-span-2" error={errors.poster} label="Poster image">
              <div className="relative">
                <label
                  className={cn(
                    "flex min-h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-background text-center transition hover:border-primary hover:bg-primary-light/55",
                    errors.poster && "border-red-300 bg-red-50",
                  )}
                >
                  <input
                    accept="image/*"
                    className="sr-only"
                    disabled={isSubmitting}
                    onChange={(event) =>
                      onPosterChange(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                  {posterPreviewUrl ? (
                    <span
                      aria-label="Selected news poster preview"
                      className="block h-56 w-full bg-contain bg-center bg-no-repeat"
                      role="img"
                      style={{
                        backgroundImage: `url(${posterPreviewUrl})`,
                      }}
                    />
                  ) : (
                    <span className="flex flex-col items-center px-6 py-10">
                      <span className="flex size-12 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                        <UploadCloud aria-hidden="true" size={22} />
                      </span>
                      <span className="mt-4 text-sm font-semibold text-text-primary">
                        Select poster from device
                      </span>
                      <span className="mt-1 max-w-sm text-xs leading-5 text-text-body">
                        The poster will upload to Cloudinary before the article is
                        published.
                      </span>
                    </span>
                  )}
                </label>

                {posterFile && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-2 text-xs text-text-body">
                    <span className="min-w-0 truncate">{posterFile.name}</span>
                    <button
                      className="shrink-0 cursor-pointer rounded-md px-2 py-1 font-semibold text-error transition hover:bg-red-50"
                      disabled={isSubmitting}
                      onClick={onClearPoster}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </FieldShell>

            <FieldShell className="sm:col-span-2" error={errors.intro} label="Intro">
              <textarea
                className={cn(fieldClassName(errors.intro), "min-h-24 py-3")}
                onChange={(event) => onChange("intro", event.target.value)}
                placeholder="Short article summary"
                value={formState.intro}
              />
            </FieldShell>

            <FieldShell
              className="sm:col-span-2"
              error={errors.description}
              label="Description"
            >
              <textarea
                className={cn(fieldClassName(errors.description), "min-h-36 py-3")}
                onChange={(event) => onChange("description", event.target.value)}
                placeholder="Full news details"
                value={formState.description}
              />
            </FieldShell>

            <SchedulePicker
              error={errors.publishedAt}
              onChange={(value) => onChange("publishedAt", value)}
              value={formState.publishedAt}
            />
          </div>

          {submitError && (
            <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              className="h-10 cursor-pointer rounded-md bg-background px-4 text-sm font-semibold text-text-body transition hover:bg-primary-light hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-text-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting && <LoaderCircle className="animate-spin" size={16} />}
              {isSubmitting ? "Publishing news" : "Add news"}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const HOUR_OPTIONS: DropdownOption[] = Array.from({ length: 12 }, (_, index) => {
  const hour = String(index + 1).padStart(2, "0");

  return {
    value: hour,
    label: hour,
  };
});
const MINUTE_OPTIONS: DropdownOption[] = Array.from({ length: 60 }, (_, index) => {
  const minute = String(index).padStart(2, "0");

  return {
    value: minute,
    label: minute,
  };
});
const PERIOD_OPTIONS: DropdownOption[] = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
];

function SchedulePicker({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const selectedDate = value ? parseScheduleDate(value) : null;
  const activeDate = selectedDate ?? new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(activeDate.getFullYear(), activeDate.getMonth(), 1),
  );
  const calendarDays = getCalendarDays(visibleMonth);
  const timeParts = getTimeParts(activeDate);

  const openPicker = () => {
    const nextActiveDate = value ? parseScheduleDate(value) : new Date();

    setVisibleMonth(
      new Date(nextActiveDate.getFullYear(), nextActiveDate.getMonth(), 1),
    );
    setIsOpen((current) => !current);
  };

  const setScheduleDate = (date: Date) => {
    const nextDate = new Date(date);

    nextDate.setHours(
      toTwentyFourHour(timeParts.hour, timeParts.period),
      Number(timeParts.minute),
      0,
      0,
    );
    onChange(toLocalDateTimeValue(nextDate));
  };

  const setScheduleTime = (
    nextHour = timeParts.hour,
    nextMinute = timeParts.minute,
    nextPeriod = timeParts.period,
  ) => {
    const nextDate = new Date(activeDate);

    nextDate.setHours(
      toTwentyFourHour(nextHour, nextPeriod),
      Number(nextMinute),
      0,
      0,
    );
    onChange(toLocalDateTimeValue(nextDate));
  };

  return (
    <FieldShell
      className="sm:col-span-2"
      error={error}
      label="Schedule publish date"
    >
      <div className="rounded-2xl border border-slate-200 bg-background p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-xl bg-white px-3 text-left text-sm text-text-primary shadow-[inset_0_0_0_1px_rgba(226,232,240,0.88)] transition hover:text-primary"
            onClick={openPicker}
            type="button"
          >
            <CalendarDays aria-hidden="true" size={17} />
            <span>
              <span className="block font-semibold">
                {value ? formatScheduleLabel(activeDate) : "Publish immediately"}
              </span>
              <span className="mt-0.5 block text-xs text-text-body">
                {value
                  ? "Custom scheduled publish time"
                  : "Open the picker to schedule this article"}
              </span>
            </span>
          </button>

          {value && (
            <button
              className="h-10 cursor-pointer rounded-md bg-white px-3 text-xs font-semibold text-text-body transition hover:bg-primary-light hover:text-primary-dark"
              onClick={() => onChange("")}
              type="button"
            >
              Clear schedule
            </button>
          )}
        </div>

        {isOpen && (
          <div className="mt-3 rounded-xl bg-white p-3 shadow-[0_16px_36px_rgba(31,41,51,0.08)] ring-1 ring-border-soft">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div>
                <div className="flex items-center justify-between">
                  <button
                    aria-label="Previous month"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
                    onClick={() =>
                      setVisibleMonth(
                        new Date(
                          visibleMonth.getFullYear(),
                          visibleMonth.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" size={16} />
                  </button>
                  <p className="text-sm font-semibold">
                    {new Intl.DateTimeFormat(undefined, {
                      month: "long",
                      year: "numeric",
                    }).format(visibleMonth)}
                  </p>
                  <button
                    aria-label="Next month"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-md bg-background text-text-body transition hover:bg-primary-light hover:text-primary"
                    onClick={() =>
                      setVisibleMonth(
                        new Date(
                          visibleMonth.getFullYear(),
                          visibleMonth.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    type="button"
                  >
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-text-body">
                  {WEEKDAY_LABELS.map((label, index) => (
                    <span key={`${label}-${index}`}>{label}</span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const isCurrentMonth =
                      day.getMonth() === visibleMonth.getMonth();
                    const isSelected = selectedDate
                      ? isSameDay(day, selectedDate)
                      : false;

                    return (
                      <button
                        className={cn(
                          "flex aspect-square cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition",
                          isSelected
                            ? "bg-primary text-white shadow-[0_10px_20px_rgba(22,120,70,0.18)]"
                            : "text-text-primary hover:bg-primary-light hover:text-primary-dark",
                          !isCurrentMonth && "text-text-body/45",
                        )}
                        key={day.toISOString()}
                        onClick={() => setScheduleDate(day)}
                        type="button"
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl bg-background p-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock3 aria-hidden="true" className="text-primary" size={17} />
                  Publish time
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <CustomDropdown
                    buttonClassName="h-10 rounded-xl px-3"
                    menuClassName="max-h-52"
                    onChange={(nextHour) => setScheduleTime(nextHour)}
                    options={HOUR_OPTIONS}
                    placeholder="Hour"
                    value={timeParts.hour}
                  />
                  <CustomDropdown
                    buttonClassName="h-10 rounded-xl px-3"
                    menuClassName="max-h-52"
                    onChange={(nextMinute) =>
                      setScheduleTime(timeParts.hour, nextMinute)
                    }
                    options={MINUTE_OPTIONS}
                    placeholder="Min"
                    value={timeParts.minute}
                  />
                  <CustomDropdown
                    buttonClassName="h-10 rounded-xl px-3"
                    onChange={(nextPeriod) =>
                      setScheduleTime(
                        timeParts.hour,
                        timeParts.minute,
                        nextPeriod as "AM" | "PM",
                      )
                    }
                    options={PERIOD_OPTIONS}
                    placeholder="AM"
                    value={timeParts.period}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-text-body">
                  Leave this empty to publish immediately, or choose a date and
                  time for scheduled release.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </FieldShell>
  );
}

function FieldShell({
  children,
  className,
  error,
  label,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
  label: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {error && <span className="mt-2 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function fieldClassName(error?: string) {
  return cn(
    "w-full rounded-2xl border bg-white px-4 text-sm text-text-primary outline-none transition focus:ring-2",
    "min-h-11",
    error
      ? "border-red-300 focus:border-red-400 focus:ring-red-100"
      : "border-slate-200 focus:border-primary focus:ring-primary/15",
  );
}

function parseScheduleDate(value: string) {
  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
}

function toLocalDateTimeValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getCalendarDays(monthDate: Date) {
  const firstDayOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const calendarStart = new Date(firstDayOfMonth);

  calendarStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);

    day.setDate(calendarStart.getDate() + index);

    return day;
  });
}

function getTimeParts(date: Date) {
  const rawHour = date.getHours();
  const period = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;

  return {
    hour: String(hour).padStart(2, "0"),
    minute: String(date.getMinutes()).padStart(2, "0"),
    period: period as "AM" | "PM",
  };
}

function toTwentyFourHour(hour: string, period: "AM" | "PM") {
  const numericHour = Number(hour);

  if (period === "AM") {
    return numericHour === 12 ? 0 : numericHour;
  }

  return numericHour === 12 ? 12 : numericHour + 12;
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function formatScheduleLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
