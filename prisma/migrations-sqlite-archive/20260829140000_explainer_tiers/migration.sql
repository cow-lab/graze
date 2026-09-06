-- "Chew on this" gains two cheaper tiers above the existing summary: a one-line TL;DR shown
-- on the card without a click, and 2-3 key findings shown when the panel opens. Both come
-- from the same single generation call, so this costs no extra API traffic.
--
-- Additive and nullable: explainers generated before this migration keep working and simply
-- render without the new tiers.
ALTER TABLE "ResearchExplainer" ADD COLUMN "tldr" TEXT;
ALTER TABLE "ResearchExplainer" ADD COLUMN "keyFindingsJson" TEXT;
