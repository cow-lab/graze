import { Globe, Link2, GraduationCap, FolderGit2 } from "lucide-react";

type Links = {
  websiteUrl: string | null;
  linkedinUrl: string | null;
  googleScholarUrl: string | null;
  githubUrl: string | null;
};

const LINK_META = [
  { key: "websiteUrl", label: "Website", Icon: Globe },
  { key: "linkedinUrl", label: "LinkedIn", Icon: Link2 },
  { key: "googleScholarUrl", label: "Google Scholar", Icon: GraduationCap },
  { key: "githubUrl", label: "GitHub", Icon: FolderGit2 },
] as const;

export default function ContactLinks({ links }: { links: Links }) {
  const present = LINK_META.filter((m) => links[m.key]);
  if (present.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {present.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={links[key]!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-moss hover:underline"
        >
          <Icon size={14} /> {label}
        </a>
      ))}
    </div>
  );
}
