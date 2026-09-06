-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PostSource" AS ENUM ('USER', 'COMBINE');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReliabilityStatus" AS ENUM ('FLAGGED', 'PREPRINT', 'PEER_REVIEWED_LISTED', 'PEER_REVIEWED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "FieldStatus" AS ENUM ('PROVISIONAL', 'ACTIVE', 'ARCHIVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FieldAssignmentSource" AS ENUM ('COMBINE', 'KEYWORD_MATCH', 'USER', 'BACKFILL');

-- CreateEnum
CREATE TYPE "JournalFlagKind" AS ENUM ('PREDATORY_LIST', 'HIJACKED', 'REMOVED_FROM_INDEX', 'RETRACTION_OUTLIER', 'OPERATOR_NOTE');

-- CreateEnum
CREATE TYPE "FlagSeverity" AS ENUM ('CAUTION', 'EXCLUDE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COMMENT_ON_POST', 'REPLY_TO_COMMENT', 'COMMENT_ON_TRACKED_PAPER');

-- CreateEnum
CREATE TYPE "EngagementKind" AS ENUM ('SOURCE_CLICK', 'COMPREHENSION_PASS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cowNumber" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "searchKeywordsJson" TEXT NOT NULL DEFAULT '[]',
    "status" "FieldStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "isAiSuggested" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostField" (
    "postId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "assignedBy" "FieldAssignmentSource" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostField_pkey" PRIMARY KEY ("postId","boardId")
);

-- CreateTable
CREATE TABLE "FieldReport" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorId" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "source" "PostSource" NOT NULL DEFAULT 'USER',
    "sourceName" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "doi" TEXT,
    "authors" TEXT,
    "field" TEXT,
    "year" INTEGER,
    "abstract" TEXT,
    "externalUrl" TEXT,
    "fileUrl" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "citationCount" INTEGER,
    "language" TEXT,
    "retractedAt" TIMESTAMP(3),
    "issn" TEXT,
    "workType" TEXT,
    "reliability" "ReliabilityStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "reviewReason" TEXT,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalCredibility" (
    "id" TEXT NOT NULL,
    "issn" TEXT NOT NULL,
    "title" TEXT,
    "publisher" TEXT,
    "inDoaj" BOOLEAN,
    "inMedline" BOOLEAN,
    "inScopus" BOOLEAN,
    "inWebOfScience" BOOLEAN,
    "apcUsd" INTEGER,
    "apcDisclosureUrl" TEXT,
    "reviewProcess" TEXT,
    "reviewUrl" TEXT,
    "publicationTimeWeeks" INTEGER,
    "worksCount" INTEGER,
    "citedByCount" INTEGER,
    "meanCitedness" DOUBLE PRECISION,
    "hIndex" INTEGER,
    "retractions" INTEGER,
    "retractionRate" DOUBLE PRECISION,
    "broadScopeScore" INTEGER,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalCredibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalFlag" (
    "id" TEXT NOT NULL,
    "issn" TEXT NOT NULL,
    "kind" "JournalFlagKind" NOT NULL,
    "severity" "FlagSeverity" NOT NULL DEFAULT 'CAUTION',
    "source" TEXT NOT NULL,
    "evidenceUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowlistJournal" (
    "id" TEXT NOT NULL,
    "issn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowlistJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiResponseCache" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "queryKey" TEXT NOT NULL,
    "responseJson" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiResponseCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchExplainer" (
    "id" TEXT NOT NULL,
    "postId" TEXT,
    "doi" TEXT,
    "tldr" TEXT,
    "keyFindingsJson" TEXT,
    "summary" TEXT NOT NULL,
    "termsJson" TEXT NOT NULL,
    "quizJson" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchExplainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "postId" TEXT,
    "commentId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "externalDoi" TEXT,
    "externalTitle" TEXT,
    "externalAuthors" TEXT,
    "externalVenue" TEXT,
    "externalYear" INTEGER,
    "externalUrl" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCardId" TEXT NOT NULL,
    "toCardId" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperEngagement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "doi" TEXT,
    "kind" "EngagementKind" NOT NULL,
    "afterExplainer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "value" "VoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentVote" (
    "id" TEXT NOT NULL,
    "value" "VoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "CommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cowNumber_key" ON "User"("cowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Board_slug_key" ON "Board"("slug");

-- CreateIndex
CREATE INDEX "PostField_boardId_idx" ON "PostField"("boardId");

-- CreateIndex
CREATE INDEX "FieldReport_boardId_idx" ON "FieldReport"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "Post_doi_key" ON "Post"("doi");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JournalCredibility_issn_key" ON "JournalCredibility"("issn");

-- CreateIndex
CREATE INDEX "JournalFlag_issn_idx" ON "JournalFlag"("issn");

-- CreateIndex
CREATE UNIQUE INDEX "JournalFlag_issn_source_kind_key" ON "JournalFlag"("issn", "source", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "AllowlistJournal_issn_key" ON "AllowlistJournal"("issn");

-- CreateIndex
CREATE UNIQUE INDEX "ApiResponseCache_source_queryKey_key" ON "ApiResponseCache"("source", "queryKey");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchExplainer_postId_key" ON "ResearchExplainer"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchExplainer_doi_key" ON "ResearchExplainer"("doi");

-- CreateIndex
CREATE INDEX "Comment_postId_idx" ON "Comment"("postId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "CanvasCard_userId_idx" ON "CanvasCard"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasCard_userId_postId_key" ON "CanvasCard"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasCard_userId_externalDoi_key" ON "CanvasCard"("userId", "externalDoi");

-- CreateIndex
CREATE INDEX "CanvasLink_userId_idx" ON "CanvasLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasLink_fromCardId_toCardId_key" ON "CanvasLink"("fromCardId", "toCardId");

-- CreateIndex
CREATE INDEX "PaperEngagement_postId_kind_idx" ON "PaperEngagement"("postId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PaperEngagement_userId_postId_kind_key" ON "PaperEngagement"("userId", "postId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PaperEngagement_userId_doi_kind_key" ON "PaperEngagement"("userId", "doi", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_postId_key" ON "Vote"("userId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentVote_userId_commentId_key" ON "CommentVote"("userId", "commentId");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostField" ADD CONSTRAINT "PostField_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostField" ADD CONSTRAINT "PostField_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldReport" ADD CONSTRAINT "FieldReport_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldReport" ADD CONSTRAINT "FieldReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalFlag" ADD CONSTRAINT "JournalFlag_issn_fkey" FOREIGN KEY ("issn") REFERENCES "JournalCredibility"("issn") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchExplainer" ADD CONSTRAINT "ResearchExplainer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasCard" ADD CONSTRAINT "CanvasCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasCard" ADD CONSTRAINT "CanvasCard_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasLink" ADD CONSTRAINT "CanvasLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasLink" ADD CONSTRAINT "CanvasLink_fromCardId_fkey" FOREIGN KEY ("fromCardId") REFERENCES "CanvasCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasLink" ADD CONSTRAINT "CanvasLink_toCardId_fkey" FOREIGN KEY ("toCardId") REFERENCES "CanvasCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperEngagement" ADD CONSTRAINT "PaperEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperEngagement" ADD CONSTRAINT "PaperEngagement_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentVote" ADD CONSTRAINT "CommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

