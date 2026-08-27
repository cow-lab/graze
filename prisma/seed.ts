import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

async function main() {
  console.log("Seeding database…");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  // Field creation has an account-age gate (a few days old, or some reputation) — backdate
  // seed accounts so they clear it immediately in a fresh demo instead of everyone hitting
  // "your account is too new" on first run.
  const seedAccountCreatedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const users = await Promise.all(
    [
      { name: "Dana Whitfield", email: "dana@quantcredit.io", verified: true },
      { name: "Prof. Elena Vasquez", email: "evasquez@mit.edu", verified: true },
      { name: "Raj Patel", email: "raj.patel@gmail.com", verified: false },
      { name: "Dr. Wei Zhang", email: "wzhang@stanford.edu", verified: true },
      { name: "Sofia Nguyen", email: "sofia@healthbridge.co", verified: true },
      { name: "Marcus Cole", email: "marcus.cole@outlook.com", verified: false },
      { name: "Priya Iyer", email: "piyer@berkeley.edu", verified: true },
      { name: "Tom Becker", email: "tbecker@gmail.com", verified: false },
      { name: "Grace Muthoni", email: "grace@aridsense.com", verified: true },
      { name: "Dr. Amara Obi", email: "amara@jhu.edu", verified: true },
      { name: "Lars Eriksen", email: "lars@nordicwind.no", verified: true },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash, createdAt: seedAccountCreatedAt },
      }),
    ),
  );

  await prisma.user.upsert({
    where: { email: "admin@graze.app" },
    update: {},
    create: {
      name: "Site Admin",
      email: "admin@graze.app",
      passwordHash,
      verified: true,
      role: "ADMIN",
      createdAt: seedAccountCreatedAt,
    },
  });

  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  // ---------- Affiliations (the real verification mechanism) ----------
  // Verification now lives here, not on the account — each of these mirrors what used
  // to be the seed user's flat `verified: true` flag, expressed as a proper affiliation.
  await Promise.all(
    [
      { email: "dana@quantcredit.io", title: "Head of Risk", institution: "QuantCredit" },
      { email: "evasquez@mit.edu", title: "Professor", institution: "MIT" },
      { email: "wzhang@stanford.edu", title: "Research Scientist", institution: "Stanford University" },
      { email: "sofia@healthbridge.co", title: "Product Lead", institution: "HealthBridge" },
      { email: "piyer@berkeley.edu", title: "PhD Candidate", institution: "UC Berkeley" },
      { email: "grace@aridsense.com", title: "Founder", institution: "AridSense" },
      { email: "amara@jhu.edu", title: "Postdoctoral Researcher", institution: "Johns Hopkins University" },
      { email: "lars@nordicwind.no", title: "Engineering Director", institution: "NordicWind" },
    ].map((a) =>
      prisma.affiliation.create({
        data: {
          userId: byEmail[a.email].id,
          title: a.title,
          institution: a.institution,
          email: a.email,
          verified: true,
        },
      }),
    ),
  );

  // ---------- Contact links ----------
  await prisma.user.update({
    where: { email: "piyer@berkeley.edu" },
    data: {
      googleScholarUrl: "https://scholar.google.com/citations?user=piyer",
      githubUrl: "https://github.com/piyer",
    },
  });

  const boards = await Promise.all(
    [
      {
        slug: "Fintech",
        name: "Fintech",
        description: "Financial technology meets applied AI — fraud, credit, payments infra.",
        searchKeywords: ["fintech", "fraud detection", "credit risk", "payments"],
      },
      {
        slug: "Climate",
        name: "Climate",
        description: "Climate science, decarbonization tech, and adaptation research.",
        searchKeywords: ["climate change", "decarbonization", "carbon capture", "climate adaptation"],
      },
      {
        slug: "Healthtech",
        name: "Healthtech",
        description: "Real problems from clinics, health systems, and med-adjacent startups.",
        searchKeywords: ["digital health", "clinical machine learning", "healthcare access"],
      },
      {
        slug: "Materials",
        name: "Materials",
        description: "Novel materials, manufacturing processes, and materials informatics.",
        searchKeywords: ["materials science", "polymer coatings", "advanced manufacturing"],
      },
      {
        slug: "Robotics",
        name: "Robotics",
        description: "Autonomous systems, actuators, and applied robotics research.",
        searchKeywords: ["robotics", "autonomous systems", "actuators", "manipulation"],
      },
      {
        slug: "Energy",
        name: "Energy",
        description: "Grid tech, storage, and renewable energy systems.",
        searchKeywords: ["renewable energy", "battery storage", "smart grid"],
      },
      {
        slug: "Agtech",
        name: "Agtech",
        description: "Precision agriculture, farm sensing, and food-system tech.",
        searchKeywords: ["precision agriculture", "crop yield", "agricultural sensors"],
      },
      {
        slug: "Cybersecurity",
        name: "Cybersecurity",
        description: "Applied security research — detection, defense, and infrastructure hardening.",
        searchKeywords: ["cybersecurity", "intrusion detection", "network security"],
      },
      {
        slug: "Edtech",
        name: "Edtech",
        description: "Learning tools, assessment, and education-access research.",
        searchKeywords: ["educational technology", "learning analytics", "adaptive learning"],
      },
    ].map((b) =>
      prisma.board.upsert({
        where: { slug: b.slug },
        update: {},
        create: {
          slug: b.slug,
          name: b.name,
          description: b.description,
          searchKeywordsJson: JSON.stringify(b.searchKeywords),
          status: "ACTIVE",
        },
      }),
    ),
  );

  const byBoard = Object.fromEntries(boards.map((b) => [b.slug, b]));

  // ---------- FintechAI ----------
  const fintechProblem = await prisma.post.create({
    data: {
      type: "POST",
      title: "Detecting synthetic identity fraud in real-time onboarding",
      description:
        "We're a mid-size digital lender processing ~40k new account applications a month. Synthetic identities (real SSN fragments stitched to fabricated personal details) are slipping past our KYC stack and defaulting after building credit history for 6-12 months. We need an approach that scores applications for synthetic-identity risk at onboarding time, using only the data we already collect (device fingerprint, application metadata, bureau pulls) — no new data partnerships.",
      authorId: byEmail["dana@quantcredit.io"].id,
      boardId: byBoard["Fintech"].id,
    },
  });

  const fintechResearch = await prisma.post.create({
    data: {
      type: "RESEARCH",
      title: "Graph Neural Networks for Synthetic Identity Detection",
      authors: "Priya Iyer, Daniel Osei",
      field: "Fintech AI",
      year: 2025,
      abstract:
        "Synthetic identities are built by combining fragments of real personal data with fabricated details, making them hard to catch with rules that check one applicant at a time. We build a graph where applications are connected if they share any piece of data (an address, a device, a phone number), and use a graph neural network to flag suspicious clusters of applications rather than judging each one alone. In tests on a large anonymized lending dataset, this approach caught significantly more synthetic identities than traditional scoring, without needing any new data sources.",
      externalUrl: "https://arxiv.org/abs/2501.04821",
      authorId: byEmail["piyer@berkeley.edu"].id,
      boardId: byBoard["Fintech"].id,
    },
  });

  await prisma.researchExplainer.create({
    data: {
      postId: fintechResearch.id,
      isDemo: true,
      summary:
        "Synthetic identities are fake people stitched together from bits of real personal data, and they're hard to spot one application at a time. This paper connects applications that share any piece of data into a graph and uses a graph neural network to flag suspicious clusters instead of judging each applicant alone. Tested on real lending data, it caught far more synthetic identities than traditional scoring — using only data lenders already collect.",
      termsJson: JSON.stringify([
        {
          term: "Synthetic identity",
          definition:
            "A fake identity built from a mix of real and fabricated personal details, used to open accounts and build fraudulent credit history.",
        },
        {
          term: "Graph neural network",
          definition:
            "A machine learning model that makes predictions using the connections between data points, not just each point on its own.",
        },
        {
          term: "KYC (Know Your Customer)",
          definition: "The identity-verification checks a lender runs before approving an applicant.",
        },
      ]),
      quizJson: JSON.stringify([
        {
          question: "Why does connecting applications into a graph help catch synthetic identities?",
          options: [
            "Fraud rings tend to reuse the same data fragments across multiple fake applications, which shows up as a cluster",
            "Graphs are required by banking regulations",
            "It lets the lender collect more personal data from applicants",
            "It removes the need for a credit bureau pull",
          ],
          correctIndex: 0,
        },
        {
          question: "What is the main practical advantage of this approach for a lender?",
          options: [
            "It requires purchasing a new external dataset",
            "It works with data the lender is already collecting, so it's easier to deploy",
            "It only works for applicants with long credit histories",
            "It eliminates the need for any human fraud review",
          ],
          correctIndex: 1,
        },
      ]),
    },
  });

  const fintechSolution = await prisma.post.create({
    data: {
      type: "POST",
      title: "Open-source fraud-graph prototype (link-analysis dashboard)",
      description:
        "Built a small prototype that ingests application metadata, builds a shared-attribute graph like the one described in Iyer & Osei's paper, and surfaces suspicious clusters in a dashboard analysts can review. Repo includes a synthetic test dataset and a walkthrough notebook.",
      refPostId: fintechResearch.id,
      authorId: byEmail["tbecker@gmail.com"].id,
      boardId: byBoard["Fintech"].id,
    },
  });

  // ---------- ClimateResearch ----------
  const climateResearch1 = await prisma.post.create({
    data: {
      type: "RESEARCH",
      title: "Low-Cost Direct Air Capture Sorbents from Recycled Amine Waste",
      authors: "Elena Vasquez, Rahul Mehta, Chen Liu",
      field: "Climate Research",
      year: 2024,
      abstract:
        "Direct air capture (machines that pull CO2 straight out of the atmosphere) is expensive largely because the chemical sorbents that grab CO2 are costly to produce. This paper shows that amine waste streams from industrial gas-treatment plants — normally discarded — can be repurposed into an effective CO2-capturing sorbent at a fraction of the cost of purpose-made materials. Lab-scale testing found capture performance close to commercial sorbents at roughly one-third the material cost.",
      externalUrl: "https://arxiv.org/abs/2403.09912",
      authorId: byEmail["evasquez@mit.edu"].id,
      boardId: byBoard["Climate"].id,
    },
  });

  await prisma.researchExplainer.create({
    data: {
      postId: climateResearch1.id,
      isDemo: true,
      summary:
        "Machines that capture CO2 straight from the air are expensive mainly because the chemical material that grabs the CO2 costs a lot to make. This paper shows that waste chemicals thrown away by industrial gas-treatment plants can be reused to make that same kind of CO2-grabbing material, at about a third of the usual cost. In lab tests, the recycled material captured almost as much CO2 as the expensive commercial version.",
      termsJson: JSON.stringify([
        {
          term: "Direct air capture (DAC)",
          definition: "Technology that removes CO2 directly from the surrounding air, rather than from a smokestack.",
        },
        {
          term: "Sorbent",
          definition: "A material that chemically grabs and holds onto a gas, like CO2, so it can be collected.",
        },
        {
          term: "Amine waste",
          definition: "Leftover amine chemicals discarded by industrial plants after being used to strip gases.",
        },
      ]),
      quizJson: JSON.stringify([
        {
          question: "What is the main cost problem this paper addresses in direct air capture?",
          options: [
            "The machines that pull air through the sorbent are too large",
            "The sorbent material that captures CO2 is expensive to produce",
            "There isn't enough CO2 in the atmosphere to capture",
            "Direct air capture requires too much government funding",
          ],
          correctIndex: 1,
        },
        {
          question: "Where does the recycled sorbent material in this paper come from?",
          options: [
            "Purpose-built chemical factories",
            "Ocean water desalination byproducts",
            "Amine waste discarded by industrial gas-treatment plants",
            "Recycled plastic bottles",
          ],
          correctIndex: 2,
        },
        {
          question: "Why does this approach matter for climate efforts?",
          options: [
            "It makes direct air capture cheaper, which could help it scale up faster",
            "It eliminates the need for renewable energy",
            "It captures methane instead of CO2",
            "It replaces the need for emissions reduction entirely",
          ],
          correctIndex: 0,
        },
      ]),
    },
  });

  const climateResearch2 = await prisma.post.create({
    data: {
      type: "RESEARCH",
      title: "Satellite-Based Early Warning for Coastal Flood Risk in Small Island States",
      authors: "Elena Vasquez, Amara Diallo",
      field: "Climate Research",
      year: 2023,
      abstract:
        "Small island nations often lack the dense sensor networks that richer coastal regions use to predict flooding. This paper combines publicly available satellite sea-level and rainfall data with a simple, low-compute forecasting model to give 48-hour flood warnings for coastal towns without any local hardware installation. Field validation in two Pacific island communities showed warning accuracy comparable to systems that cost 20x more to deploy.",
      externalUrl: "https://arxiv.org/abs/2309.11207",
      authorId: byEmail["evasquez@mit.edu"].id,
      boardId: byBoard["Climate"].id,
    },
  });

  await prisma.researchExplainer.create({
    data: {
      postId: climateResearch2.id,
      isDemo: true,
      summary:
        "Small island nations often can't afford the expensive sensor networks that predict coastal flooding elsewhere. This paper builds a flood-warning system using only free satellite data and a lightweight forecasting model, so no local hardware needs to be installed. Tested in two Pacific island communities, it gave accurate 48-hour flood warnings at a fraction of the cost of typical systems.",
      termsJson: JSON.stringify([
        {
          term: "Early warning system",
          definition: "A system that predicts a hazard before it happens, giving people time to prepare.",
        },
        {
          term: "Low-compute model",
          definition: "A forecasting model designed to run on modest, inexpensive computing hardware.",
        },
      ]),
      quizJson: JSON.stringify([
        {
          question: "What problem does this system solve for small island nations?",
          options: [
            "They have too much flood sensor data to process",
            "They lack the sensor infrastructure that richer regions use for flood prediction",
            "Their satellites are outdated",
            "They need to reduce rainfall in coastal areas",
          ],
          correctIndex: 1,
        },
        {
          question: "How does the system avoid requiring local hardware installation?",
          options: [
            "It relies on volunteers to manually report water levels",
            "It uses publicly available satellite data instead of ground sensors",
            "It only works during dry seasons",
            "It requires each town to buy a weather balloon",
          ],
          correctIndex: 1,
        },
      ]),
    },
  });

  const climateProblem = await prisma.post.create({
    data: {
      type: "POST",
      title: "Need for affordable soil-moisture sensors for smallholder farms",
      description:
        "We work with smallholder maize and cassava farmers across East Africa on drought resilience programs. Commercial soil-moisture sensors run $80-150 per unit, which is out of reach at the scale we need (thousands of farms). We need a sensor design or product that can be manufactured or assembled for under $10/unit while still giving usable irrigation-timing signal.",
      authorId: byEmail["grace@aridsense.com"].id,
      boardId: byBoard["Climate"].id,
    },
  });

  await prisma.post.create({
    data: {
      type: "POST",
      title: "Capacitive soil-moisture sensor prototype under $8/unit BOM",
      description:
        "Prototype using a simple capacitive sensing circuit (two copper strips + a 555 timer) read by an ESP32, batched over LoRa to a shared gateway. Bill of materials comes in under $8/unit at small-batch pricing. Field-tested on 3 test plots for two weeks against a commercial sensor with ~85% correlation on readings.",
      refPostId: climateProblem.id,
      authorId: byEmail["marcus.cole@outlook.com"].id,
      boardId: byBoard["Climate"].id,
    },
  });

  // ---------- HealthtechProblems ----------
  const healthProblem = await prisma.post.create({
    data: {
      type: "POST",
      title: "Predicting no-show appointments in low-resource clinics",
      description:
        "We run a network of community health clinics where no-show rates hover around 30%, wasting scarce provider time. We don't have the budget for a commercial predictive scheduling product. We need a lightweight approach to flag high-risk appointments (for a reminder call) using only data already in our basic EHR — no new patient surveys or data collection.",
      authorId: byEmail["sofia@healthbridge.co"].id,
      boardId: byBoard["Healthtech"].id,
    },
  });

  const healthResearch = await prisma.post.create({
    data: {
      type: "RESEARCH",
      title: "Lightweight ML for No-Show Prediction in Community Clinics",
      authors: "Amara Obi, Jonah Kessler",
      field: "Healthtech",
      year: 2025,
      abstract:
        "Missed appointments waste provider time that's especially scarce in under-resourced clinics, but most no-show prediction tools require data these clinics don't collect. This paper shows that a simple model using only appointment history already sitting in basic electronic health records — like time since booking, past no-show count, and appointment type — can flag high-risk appointments about as well as far more complex commercial systems. The model is small enough to run on a clinic's existing scheduling computer with no cloud service required.",
      externalUrl: "https://arxiv.org/abs/2502.16650",
      authorId: byEmail["amara@jhu.edu"].id,
      boardId: byBoard["Healthtech"].id,
    },
  });

  await prisma.researchExplainer.create({
    data: {
      postId: healthResearch.id,
      isDemo: true,
      summary:
        "Missed clinic appointments waste scarce provider time, but most prediction tools need patient data that under-resourced clinics don't collect. This paper shows a simple model using only basic appointment history — like how far in advance it was booked and past no-shows — can flag risky appointments nearly as well as expensive commercial tools. It's small enough to run on a clinic's existing computer with no cloud service needed.",
      termsJson: JSON.stringify([
        {
          term: "No-show prediction",
          definition: "Estimating in advance which scheduled appointments a patient is unlikely to attend.",
        },
        {
          term: "Electronic health record (EHR)",
          definition: "The digital system clinics use to store patient and appointment information.",
        },
        {
          term: "Lightweight model",
          definition: "A prediction model small and simple enough to run on ordinary, inexpensive computers.",
        },
      ]),
      quizJson: JSON.stringify([
        {
          question: "What data does this model rely on to predict no-shows?",
          options: [
            "New patient surveys collected specifically for this purpose",
            "Appointment history already stored in the clinic's basic EHR",
            "Social media activity",
            "Data purchased from a commercial health-data broker",
          ],
          correctIndex: 1,
        },
        {
          question: "Why does it matter that the model is 'lightweight'?",
          options: [
            "It means the model has fewer accuracy guarantees",
            "It can run on a clinic's existing computer without needing a cloud service or big budget",
            "It only works for clinics with fewer than 10 patients",
            "It requires less patient consent paperwork",
          ],
          correctIndex: 1,
        },
      ]),
    },
  });

  await prisma.post.create({
    data: {
      type: "POST",
      title: "No-show risk flag added to open-source clinic scheduler",
      description:
        "Implemented the appointment-history features from Obi & Kessler's paper as a plugin for OpenClinicScheduler, surfacing a risk flag (low/med/high) next to each appointment so front-desk staff know who to call for reminders. Piloted at one clinic for a month.",
      refPostId: healthResearch.id,
      authorId: byEmail["raj.patel@gmail.com"].id,
      boardId: byBoard["Healthtech"].id,
    },
  });

  // ---------- MaterialsScience ----------
  const materialsResearch = await prisma.post.create({
    data: {
      type: "RESEARCH",
      title: "Self-Healing Polymer Coatings for Marine Infrastructure",
      authors: "Wei Zhang, Ines Fontaine",
      field: "Materials Science",
      year: 2025,
      abstract:
        "Protective coatings on offshore structures crack from wave impact and salt exposure, letting corrosion start underneath before anyone notices. This paper describes a polymer coating with microcapsules of healing agent embedded inside — when a crack forms, the capsules break open and seal the crack automatically, without needing an inspection or repair crew. In saltwater tank tests, coated steel samples resisted corrosion for over 5x longer than samples with standard coatings.",
      externalUrl: "https://arxiv.org/abs/2411.02233",
      authorId: byEmail["wzhang@stanford.edu"].id,
      boardId: byBoard["Materials"].id,
    },
  });

  await prisma.researchExplainer.create({
    data: {
      postId: materialsResearch.id,
      isDemo: true,
      summary:
        "Coatings on offshore structures crack from waves and salt, letting corrosion sneak in underneath before anyone notices. This paper describes a coating with tiny healing capsules built in — when a crack forms, the capsules break open and seal it automatically, with no inspection or repair crew needed. In saltwater tests, coated steel resisted corrosion over 5 times longer than steel with standard coatings.",
      termsJson: JSON.stringify([
        {
          term: "Self-healing coating",
          definition: "A protective coating that automatically repairs its own small cracks without human intervention.",
        },
        {
          term: "Microcapsule",
          definition: "A tiny sealed capsule embedded in a material that releases its contents when the material is damaged.",
        },
        {
          term: "Corrosion",
          definition: "The gradual damage to metal caused by chemical reaction with its environment, like saltwater.",
        },
      ]),
      quizJson: JSON.stringify([
        {
          question: "How does the coating repair itself when it cracks?",
          options: [
            "A remote sensor alerts a repair crew automatically",
            "Embedded microcapsules break open and release a healing agent that seals the crack",
            "The coating is replaced on a fixed schedule",
            "It uses solar power to reheat and reseal cracks",
          ],
          correctIndex: 1,
        },
        {
          question: "Why does this matter for offshore infrastructure specifically?",
          options: [
            "Offshore structures are hard and costly to inspect and repair regularly",
            "Offshore structures don't experience any corrosion",
            "It removes the need for steel in construction",
            "It makes structures resistant to earthquakes",
          ],
          correctIndex: 0,
        },
      ]),
    },
  });

  const materialsProblem = await prisma.post.create({
    data: {
      type: "POST",
      title: "Corrosion-resistant coating needed for offshore wind turbine bases",
      description:
        "Our offshore wind turbine foundations are showing coating failure and early corrosion after 2-3 years, well short of the 20-year design life, in the splash zone (the section repeatedly exposed to waves and air). Standard marine coatings aren't holding up to that specific stress. We're open to any materials approach — coatings, cladding, or cathodic protection — that's been validated at even lab or pilot scale.",
      authorId: byEmail["lars@nordicwind.no"].id,
      boardId: byBoard["Materials"].id,
    },
  });

  await prisma.post.create({
    data: {
      type: "POST",
      title: "Splash-zone coating test rig + self-healing formulation writeup",
      description:
        "Built a small accelerated-weathering test rig (simulated wave splash + UV + salt spray) to benchmark coating candidates, including a variant of the self-healing microcapsule approach from Zhang & Fontaine's paper adapted for a steel substrate. Early results and rig design shared in the linked writeup.",
      refPostId: materialsResearch.id,
      authorId: byEmail["tbecker@gmail.com"].id,
      boardId: byBoard["Materials"].id,
    },
  });

  // ---------- Votes ----------
  const allPosts = [
    fintechProblem,
    fintechResearch,
    fintechSolution,
    climateResearch1,
    climateResearch2,
    climateProblem,
    healthProblem,
    healthResearch,
    materialsResearch,
    materialsProblem,
  ];

  const voters = users.filter((u) => u.email !== "tbecker@gmail.com");
  for (const post of allPosts) {
    const shuffled = [...voters].sort(() => Math.random() - 0.5);
    const upCount = 3 + Math.floor(Math.random() * 6);
    for (const voter of shuffled.slice(0, upCount)) {
      await prisma.vote.upsert({
        where: { userId_postId: { userId: voter.id, postId: post.id } },
        update: {},
        create: { userId: voter.id, postId: post.id, value: "UP" },
      });
    }
    const downCount = Math.floor(Math.random() * 2);
    for (const voter of shuffled.slice(upCount, upCount + downCount)) {
      await prisma.vote.upsert({
        where: { userId_postId: { userId: voter.id, postId: post.id } },
        update: {},
        create: { userId: voter.id, postId: post.id, value: "DOWN" },
      });
    }
  }

  // ---------- Comments ----------
  const c1 = await prisma.comment.create({
    data: {
      postId: fintechProblem.id,
      authorId: byEmail["piyer@berkeley.edu"].id,
      body: "This lines up with what we saw in our graph-based fraud detection work — shared attributes across applications are a strong signal. Happy to chat about adapting it to your data.",
    },
  });
  await prisma.comment.create({
    data: {
      postId: fintechProblem.id,
      authorId: byEmail["dana@quantcredit.io"].id,
      parentId: c1.id,
      body: "That would be great — we don't have any graph tooling in our stack today, so even a rough prototype pointed at our application logs would help.",
    },
  });
  // Demonstrates anonymous posting: Marcus posts this one as "Cow #4271" rather than
  // under his own name (his account is still the real authorId — anonymity is display-only).
  await prisma.user.update({
    where: { email: "marcus.cole@outlook.com" },
    data: { cowNumber: 4271 },
  });
  await prisma.comment.create({
    data: {
      postId: fintechProblem.id,
      authorId: byEmail["marcus.cole@outlook.com"].id,
      isAnonymous: true,
      body: "Have you looked at device fingerprint reuse specifically? In our experience that's often the strongest single signal before you even need a full graph model.",
    },
  });

  const c2 = await prisma.comment.create({
    data: {
      postId: climateResearch1.id,
      authorId: byEmail["grace@aridsense.com"].id,
      body: "Really promising for cost-constrained deployments. Do you have a sense of how the recycled sorbent's capture rate degrades over repeat use cycles compared to the commercial material?",
    },
  });
  await prisma.comment.create({
    data: {
      postId: climateResearch1.id,
      authorId: byEmail["evasquez@mit.edu"].id,
      parentId: c2.id,
      body: "Good question — we saw about 8% degradation after 50 cycles vs 5% for the commercial sorbent in our lab tests. Working on a follow-up looking at longer cycle counts now.",
    },
  });

  await prisma.comment.create({
    data: {
      postId: healthProblem.id,
      authorId: byEmail["amara@jhu.edu"].id,
      body: "We published a paper on almost exactly this a few months back using only EHR appointment history — linked it as a research post in this field if it's useful.",
    },
  });

  // ---------- Curated allowlist (DOAJ-style validity filter) ----------
  await Promise.all(
    [
      { issn: "1932-6203", name: "PLOS ONE", publisher: "Public Library of Science" },
      { issn: "2045-2322", name: "Scientific Reports", publisher: "Nature Portfolio" },
      { issn: "2296-2565", name: "Frontiers in Public Health", publisher: "Frontiers Media" },
    ].map((j) =>
      prisma.allowlistJournal.upsert({
        where: { issn: j.issn },
        update: {},
        create: { ...j, source: "CURATED" },
      }),
    ),
  );

  // ---------- The Combine: a couple of pre-populated auto-imported entries ----------
  // Demonstrates the "auto-imported from X" badge in the feed/library on first run,
  // without needing a live Crossref/OpenAlex/DOAJ round-trip. Since The Combine
  // auto-publishes anything that passes its checks, these seed straight in as
  // PUBLISHED rather than sitting in /admin/queue.
  const combineAuthor = await prisma.user.upsert({
    where: { email: "the-combine@graze.internal" },
    update: {},
    create: {
      name: "The Combine",
      email: "the-combine@graze.internal",
      passwordHash: "!",
      verified: true,
    },
  });

  const queueSeed = [
    {
      title: "Modular Soft Grippers for Low-Cost Warehouse Picking Robots",
      authors: "H. Okonkwo, M. Reyes",
      board: "Robotics",
      journal: "Scientific Reports",
      year: 2025,
      doi: "10.1038/s41598-025-99123-4",
      citationCount: 14,
      abstract:
        "Rigid robotic grippers struggle with the wide variety of irregular items in warehouse picking, often damaging fragile goods or dropping oddly-shaped ones. This paper presents a soft, modular gripper built from silicone fingers that conform to an object's shape on contact, assembled from cheap, swappable parts so a damaged finger can be replaced in minutes instead of the whole gripper. In trials picking 200 mixed warehouse items, the modular soft gripper matched the success rate of grippers costing 4x more.",
      summary:
        "Rigid robot grippers often damage fragile items or drop oddly-shaped ones in warehouses. This paper builds a soft, modular gripper from cheap silicone fingers that conform to whatever they touch, with parts that swap out in minutes when damaged instead of replacing the whole gripper. In warehouse trials, it matched pricier rigid grippers' success rate at a fraction of the cost.",
      terms: [
        { term: "Soft gripper", definition: "A robotic hand made from flexible material that molds around an object instead of gripping it rigidly." },
        { term: "Modular design", definition: "Built from separate, swappable parts, so a single broken piece can be replaced without discarding the whole device." },
      ],
      quiz: [
        {
          question: "What problem does a soft, modular gripper solve compared to a rigid one?",
          options: [
            "It handles irregular or fragile items better and is cheaper to repair",
            "It can lift heavier objects than any rigid gripper",
            "It eliminates the need for a robotic arm entirely",
            "It never needs to be replaced",
          ],
          correctIndex: 0,
        },
        {
          question: "How did the modular soft gripper compare to expensive rigid grippers in testing?",
          options: [
            "It performed worse but was cheaper",
            "It matched their success rate at a fraction of the cost",
            "It only worked on uniformly shaped boxes",
            "It required more maintenance",
          ],
          correctIndex: 1,
        },
      ],
    },
    {
      title: "Second-Life Battery Degradation Forecasting for Residential Solar Storage",
      authors: "T. Lindberg, A. Osei",
      board: "Energy",
      journal: "PLOS ONE",
      year: 2024,
      doi: "10.1371/journal.pone.0299887",
      citationCount: 3,
      // Demo data for the retraction re-sync feature — flagged here directly rather than
      // by actually calling Crossref during seeding, so the "Retracted" badge has
      // something to show on first run without a network round-trip.
      retracted: true,
      abstract:
        "Batteries retired from electric vehicles still hold significant usable capacity, but predicting how quickly a specific used battery will keep degrading is hard, which makes homeowners and installers reluctant to rely on them for solar storage. This paper trains a forecasting model on real second-life battery usage data to predict remaining useful life within a home solar setup, letting installers set realistic capacity guarantees instead of avoiding second-life batteries altogether.",
      summary:
        "Batteries retired from electric cars still have plenty of life left, but nobody could reliably predict how fast a specific used battery would keep degrading — so installers avoided using them for home solar storage. This paper builds a forecasting model trained on real usage data that predicts a used battery's remaining useful life, letting installers offer realistic guarantees instead of steering clear of second-life batteries.",
      terms: [
        { term: "Second-life battery", definition: "A battery retired from its original use (like an electric car) that still has enough capacity to be reused elsewhere." },
        { term: "Degradation forecasting", definition: "Predicting how much a battery's capacity will decline over time based on how it's been used." },
      ],
      quiz: [
        {
          question: "Why were installers hesitant to use second-life EV batteries for home solar storage?",
          options: [
            "The batteries were too expensive",
            "They couldn't reliably predict how fast a given used battery would degrade",
            "Second-life batteries don't work with solar panels",
            "Government regulations banned it",
          ],
          correctIndex: 1,
        },
        {
          question: "What does the forecasting model let installers do?",
          options: [
            "Charge batteries faster",
            "Offer realistic capacity guarantees instead of avoiding second-life batteries",
            "Manufacture new batteries more cheaply",
            "Skip safety testing",
          ],
          correctIndex: 1,
        },
      ],
    },
  ];

  for (const q of queueSeed as (typeof queueSeed[number] & { citationCount?: number; retracted?: boolean })[]) {
    const post = await prisma.post.create({
      data: {
        type: "RESEARCH",
        title: q.title,
        authors: q.authors,
        field: q.journal,
        year: q.year,
        abstract: q.abstract,
        externalUrl: `https://doi.org/${q.doi}`,
        authorId: combineAuthor.id,
        boardId: byBoard[q.board].id,
        source: "COMBINE",
        sourceName: q.journal === "Scientific Reports" ? "OpenAlex" : "Crossref",
        status: "PUBLISHED",
        doi: q.doi,
        citationCount: q.citationCount ?? null,
        retractedAt: q.retracted ? new Date() : null,
      },
    });

    await prisma.researchExplainer.create({
      data: {
        postId: post.id,
        isDemo: true,
        summary: q.summary,
        termsJson: JSON.stringify(q.terms),
        quizJson: JSON.stringify(q.quiz),
      },
    });
  }

  // ---------- Provisional Fields (demo data for the new spam-prevention flow) ----------
  // One freshly user-created Field still building traction, one Combine-suggested Field,
  // and one reported Field — so the sidebar's "New fields" section and /admin/fields both
  // have something to show on first run instead of being empty.
  const spaceTech = await prisma.board.create({
    data: {
      slug: "SpaceTech",
      name: "SpaceTech",
      description: "Launch systems, satellites, and orbital infrastructure.",
      searchKeywordsJson: JSON.stringify(["satellite", "spacecraft", "orbital mechanics"]),
      status: "PROVISIONAL",
      createdById: byEmail["tbecker@gmail.com"].id,
    },
  });
  await prisma.post.create({
    data: {
      type: "POST",
      title: "Cheap ground-station antenna design for university CubeSats",
      description:
        "Most off-the-shelf ground station antennas for tracking student CubeSats run well over $10k, which is out of reach for a lot of university programs. Looking for a lower-cost design that still holds a reliable link during a pass.",
      authorId: byEmail["tbecker@gmail.com"].id,
      boardId: spaceTech.id,
    },
  });

  await prisma.board.create({
    data: {
      slug: "QuantumComputing",
      name: "Quantum Computing",
      description:
        "Quantum algorithms, error correction, and near-term (NISQ-era) hardware research.",
      searchKeywordsJson: JSON.stringify(["quantum computing", "quantum error correction", "qubit"]),
      status: "PROVISIONAL",
      isAiSuggested: true,
    },
  });

  const oddField = await prisma.board.create({
    data: {
      slug: "TotallyReal",
      name: "Totally Real Stuff",
      description: "definitely a real field trust me, check out my link",
      searchKeywordsJson: JSON.stringify(["stuff"]),
      status: "PROVISIONAL",
      createdById: byEmail["raj.patel@gmail.com"].id,
    },
  });
  await prisma.fieldReport.create({
    data: {
      boardId: oddField.id,
      reporterId: byEmail["dana@quantcredit.io"].id,
      reason: "Name and description read as spam/promotional, not an actual topic.",
    },
  });

  console.log(
    `Seeded ${users.length + 2} users, ${boards.length + 3} boards (3 provisional), ${allPosts.length} posts.`,
  );
  console.log(`Demo login password for every seed user: ${DEMO_PASSWORD}`);
  console.log(
    `Admin login: admin@graze.app / ${DEMO_PASSWORD} — see /admin/queue, /admin/fields, and try "Run The Combine now"`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
