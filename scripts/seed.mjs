import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const args = parseArgs(process.argv.slice(2));
const projectId = requiredEnv("FIREBASE_ADMIN_PROJECT_ID");
const clientEmail = requiredEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
const privateKey = requiredEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n");

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
const auth = getAuth(app);
const db = getFirestore(app);
const now = Date.now();
const random = createRandom(0xacad3);
const counts = new Map();

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument.startsWith("--")) result[argument.slice(2)] = argv[index + 1];
  }
  return result;
}

function createRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function timestampFromMs(milliseconds) {
  return Timestamp.fromMillis(milliseconds);
}

function addCount(collection) {
  counts.set(collection, (counts.get(collection) ?? 0) + 1);
}

function doc(collection, id, data) {
  return { collection, id, data: { ...data, isSeed: true } };
}

async function writeAll(documents) {
  for (let index = 0; index < documents.length; index += 400) {
    const batch = db.batch();
    for (const item of documents.slice(index, index + 400)) {
      batch.set(db.collection(item.collection).doc(item.id), item.data);
      addCount(item.collection);
    }
    await batch.commit();
  }
}

async function getOrCreateUser({ phoneNumber, email, name, role }) {
  let user;

  if (phoneNumber) {
    try {
      user = await auth.getUserByPhoneNumber(phoneNumber);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }
  } else if (email) {
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }
  }

  if (!user) {
    user = await auth.createUser({
      ...(phoneNumber ? { phoneNumber } : {}),
      ...(email ? { email } : {}),
      displayName: name,
    });
  }

  return {
    id: user.uid,
    profile: doc("users", user.uid, {
      name,
      ...(phoneNumber ? { phone: phoneNumber } : {}),
      ...(email ? { email } : {}),
      role,
      status: "active",
      createdAt: timestampFromMs(now),
    }),
  };
}

const courseData = [
  ["data-analytics", "Data Analytics", "Business intelligence and practical data skills.", "Data", "Ananya Mehta", 12, 28000, "Mon/Wed 6:00 PM", ["Analytics foundations", "Excel and SQL", "Python analysis", "Dashboards", "Capstone project"]],
  ["full-stack-web", "Full Stack Web Development", "Build and deploy modern production web applications.", "Development", "Rohan Kapoor", 16, 42000, "Tue/Thu 7:00 PM", ["HTML and CSS", "JavaScript", "React", "Node and APIs", "Databases", "Deployment"]],
  ["ai-ml-fundamentals", "AI & ML Fundamentals", "A practical introduction to machine learning and responsible AI.", "Artificial Intelligence", "Dr. Kavya Rao", 14, 46000, "Sat/Sun 10:00 AM", ["Python for ML", "Statistics", "Supervised learning", "Neural networks", "AI project"]],
  ["cloud-aws", "Cloud & AWS", "Learn cloud architecture, deployment, and operations on AWS.", "Cloud Computing", "Vikram Nair", 10, 36000, "Mon/Fri 6:30 PM", ["Cloud concepts", "IAM and networking", "Compute", "Storage", "Cloud project"]],
  ["ui-ux-design", "UI/UX Design", "Design accessible, user-centred digital experiences.", "Design", "Ishita Sen", 10, 30000, "Wed/Sat 5:00 PM", ["Research", "Information architecture", "Wireframes", "Visual design", "Portfolio project"]],
].map(([id, title, description, category, instructor, durationWeeks, fee, schedule, modules]) => ({
  id,
  title,
  description,
  category,
  instructor,
  durationWeeks,
  fee,
  schedule,
  modules,
  resources: [
    { title: `${title} handbook`, url: `https://example.com/${id}/handbook.pdf`, type: "pdf" },
    { title: `${title} orientation`, url: `https://example.com/${id}/orientation`, type: "video" },
    { title: `${title} resource hub`, url: `https://example.com/${id}/resources`, type: "link" },
  ],
  isActive: true,
}));

const students = [
  "Aarav Patel", "Aditi Singh", "Arjun Verma", "Diya Shah", "Ishaan Gupta", "Kiara Joshi",
  "Kabir Malhotra", "Meera Iyer", "Nisha Reddy", "Rahul Bansal", "Saanvi Desai", "Vivaan Kumar",
  "Anaya Das", "Dev Menon", "Ira Chatterjee", "Manav Sethi", "Navya Nair", "Reyansh Yadav",
  "Riya Kulkarni", "Samar Roy", "Shreya Pillai", "Tanya Mishra", "Vedant Rao", "Zoya Khan",
];
const categories = ["Payment & Billing", "Technical Access", "Course Content", "Class Schedule", "Attendance", "Certificate", "Enrollment", "General"];
const departments = {
  "Payment & Billing": "Finance",
  "Technical Access": "Technical Support",
  "Course Content": "Academics",
  "Class Schedule": "Academics",
  Attendance: "Student Affairs",
  Certificate: "Student Affairs",
  Enrollment: "Admissions",
  General: "Student Affairs",
};
const priorities = ["low", "medium", "high", "critical"];
const sentiments = ["neutral", "negative", "urgent", "positive"];

async function main() {
  const documents = [];
  const demoStudent = args["student-phone"]
    ? await getOrCreateUser({ phoneNumber: args["student-phone"], name: "Priya Sharma", role: "student" })
    : null;
  const adminUsers = [];

  for (const phoneNumber of [args["admin-phone"]].filter(Boolean)) {
    adminUsers.push(await getOrCreateUser({ phoneNumber, name: "Academy Admin", role: "admin" }));
  }
  if (args["admin-email"]) {
    adminUsers.push(await getOrCreateUser({ email: args["admin-email"], name: "Academy Admin", role: "admin" }));
  }
  if (demoStudent) documents.push(demoStudent.profile);
  for (const admin of adminUsers) documents.push(admin.profile);

  for (const course of courseData) {
    documents.push(doc("courses", course.id, course));
  }

  for (const course of courseData) {
    for (let index = 0; index < 6; index += 1) {
      const isPast = index < 2;
      const classTime = isPast
        ? now - (index + 1) * 3 * 86400000
        : now + (index - 1) * 2 * 86400000;
      documents.push(doc("classes", `${course.id}-${index + 1}`, {
        courseId: course.id,
        title: `${course.title} - ${isPast ? "Session" : "Live Class"} ${index + 1}`,
        startsAt: timestampFromMs(classTime),
        mode: index % 2 ? "online" : "in-person",
        ...(index % 2 ? { joinLink: `https://example.com/classes/${course.id}-${index + 1}` } : { location: `AcademyDesk Room ${index + 1}` }),
        ...(isPast ? { recordingUrl: `https://example.com/recordings/${course.id}-${index + 1}` } : {}),
      }));
    }
  }

  for (let index = 0; index < 5; index += 1) {
    documents.push(doc("announcements", `seed-announcement-${index + 1}`, {
      title: ["Welcome to the new cohort", "Career workshop this Friday", "Payment deadline reminder", "New AI lab resources", "Campus holiday notice"][index],
      body: "Please check your student dashboard for the latest AcademyDesk update.",
      courseId: index < 2 ? null : courseData[index - 2].id,
      createdAt: timestampFromMs(now - (index + 1) * 86400000),
    }));
    documents.push(doc("internships", `seed-internship-${index + 1}`, {
      title: ["Junior Data Analyst", "Frontend Developer Intern", "ML Research Intern", "Cloud Operations Intern", "Product Design Intern"][index],
      company: ["BlueOrbit Labs", "MangoStack", "Cedar AI", "NimbusWorks", "PixelKraft"][index],
      location: ["Bengaluru", "Pune", "Hyderabad", "Chennai", "Remote"][index],
      skills: [["SQL", "Excel"], ["React", "TypeScript"], ["Python", "ML"], ["AWS", "Linux"], ["Figma", "Research"]][index],
      eligibleCourseIds: [courseData[index].id],
      deadline: timestampFromMs(now + (index + 10) * 86400000),
      applyUrl: `https://example.com/internships/seed-${index + 1}`,
    }));
  }

  const fakeStudentIds = [];
  for (let index = 0; index < students.length; index += 1) {
    const id = `seed-student-${String(index + 1).padStart(2, "0")}`;
    fakeStudentIds.push(id);
    const createdAt = now - (45 - Math.floor(index * 1.7)) * 86400000;
    documents.push(doc("users", id, {
      name: students[index],
      email: `seed.student${String(index + 1).padStart(2, "0")}@example.com`,
      role: "student",
      status: index >= 20 ? "inactive" : "active",
      createdAt: timestampFromMs(createdAt),
    }));

    const enrollmentCount = 1 + (index % 3);
    for (let courseIndex = 0; courseIndex < enrollmentCount; courseIndex += 1) {
      const course = courseData[(index + courseIndex) % courseData.length];
      const enrollmentId = `${id}_${course.id}`;
      const progressPercent = [0, 25, 48, 72, 100][(index + courseIndex) % 5];
      documents.push(doc("enrollments", enrollmentId, {
        uid: id,
        courseId: course.id,
        courseTitle: course.title,
        status: progressPercent === 100 ? "completed" : "active",
        enrolledAt: timestampFromMs(now - ((index * 2 + courseIndex * 5) % 45) * 86400000),
        progressPercent,
        attendedClasses: Math.floor(progressPercent / 10),
        totalClasses: 20,
        certificateStatus: progressPercent === 100 ? "issued" : "not_eligible",
      }));
      const paymentStatus = (index + courseIndex) % 7 === 0 ? "overdue" : (index + courseIndex) % 5 === 0 ? "pending" : "paid";
      documents.push(doc("payments", `${enrollmentId}-payment`, {
        uid: id,
        enrollmentId,
        courseTitle: course.title,
        amount: course.fee,
        status: paymentStatus,
        dueDate: timestampFromMs(now - (paymentStatus === "paid" ? 10 : -5) * 86400000),
        paidAt: paymentStatus === "paid" ? timestampFromMs(now - 8 * 86400000) : null,
        receiptNo: paymentStatus === "paid" ? `RCP-SEED-${index + 1}-${courseIndex + 1}` : null,
      }));
    }
  }

  if (demoStudent) {
    const demoEnrollments = [
      ["full-stack-web", "active", 62, 14, "not_eligible", "paid"],
      ["ai-ml-fundamentals", "active", 30, 6, "not_eligible", "paid"],
      ["ui-ux-design", "completed", 100, 20, "issued", "paid"],
      ["data-analytics", "active", 15, 3, "not_eligible", "pending"],
    ];
    for (const [courseId, status, progressPercent, attendedClasses, certificateStatus, paymentStatus] of demoEnrollments) {
      const course = courseData.find((item) => item.id === courseId);
      const enrollmentId = `${demoStudent.id}_${courseId}`;
      documents.push(doc("enrollments", enrollmentId, {
        uid: demoStudent.id, courseId, courseTitle: course.title, status, enrolledAt: timestampFromMs(now - 20 * 86400000),
        progressPercent, attendedClasses, totalClasses: 20, certificateStatus,
      }));
      documents.push(doc("payments", `${enrollmentId}-payment`, {
        uid: demoStudent.id, enrollmentId, courseTitle: course.title, amount: course.fee, status: paymentStatus,
        dueDate: timestampFromMs(now - (paymentStatus === "paid" ? 10 : -3) * 86400000),
        paidAt: paymentStatus === "paid" ? timestampFromMs(now - 7 * 86400000) : null,
        receiptNo: paymentStatus === "paid" ? `RCP-DEMO-${courseId}` : null,
      }));
    }
    addDemoTickets(documents, demoStudent.id);
  }

  addFakeTickets(documents, fakeStudentIds);
  await writeAll(documents);

  console.log(`Firebase project: ${projectId}`);
  console.log("Seed counts:");
  for (const [collection, count] of counts) console.log(`- ${collection}: ${count}`);
}

function addDemoTickets(documents, uid) {
  const tickets = [
    ["demo-resolved-payment", "resolved", "Payment & Billing", "medium", "neutral", 12, "I paid my course fee and need confirmation.", "Your payment has been verified and your enrollment is active.", "Payment confirmed."],
    ["demo-escalated-access", "in_progress", "Technical Access", "high", "urgent", 4, "I cannot access my class portal before today's live class.", "Our technical team is investigating your access issue.", "Access issue escalated for immediate review."],
    ["demo-open-schedule", "open", "Class Schedule", "low", "neutral", 1, "Please confirm the schedule for my next class.", "We have received your question and will confirm the schedule shortly.", null],
  ];
  for (const [id, status, category, priority, sentiment, ageHours, message, reply, internalNote] of tickets) {
    documents.push(...ticketDocuments({ id, uid, studentName: "Priya Sharma", status, category, priority, sentiment, ageHours, message, reply, internalNote, escalated: status === "in_progress" }));
  }
}

function addFakeTickets(documents, studentIds) {
  for (let index = 0; index < 35; index += 1) {
    const ageDays = index < 10 ? index % 7 : 7 + (index % 23);
    let category;
    if (index < 5) category = "Payment & Billing";
    else if (index < 11) category = "Technical Access";
    else category = categories[index % categories.length];
    const status = index % 9 < 4 ? "resolved" : index % 9 < 6 ? "closed" : ["open", "in_progress", "assigned", "waiting"][index % 4];
    const priority = priorities[index % priorities.length];
    const uid = studentIds[index % studentIds.length];
    documents.push(...ticketDocuments({
      id: `seed-ticket-${String(index + 1).padStart(2, "0")}`,
      uid,
      studentName: students[index % students.length],
      status,
      category,
      priority,
      sentiment: sentiments[index % sentiments.length],
      ageHours: ageDays * 24 + 6 + (index % 15),
      message: `${category} support request for demo student ${index + 1}.`,
      reply: status === "resolved" || status === "closed" ? "This request has been reviewed and resolved by the support team." : "Our support team is reviewing your request.",
      internalNote: `Seeded ${category} triage record.`,
      escalated: index % 9 === 0 || index === 17 || index === 26 || index === 32,
      fallback: index % 11 === 0,
    }));
  }
}

function ticketDocuments({ id, uid, studentName, status, category, priority, sentiment, ageHours, message, reply, internalNote, escalated, fallback = false }) {
  const createdAt = timestampFromMs(now - ageHours * 3600000);
  const resolvedAt = status === "resolved" || status === "closed"
    ? timestampFromMs(now - Math.max(1, ageHours - (6 + Math.floor(random() * 15))) * 3600000)
    : null;
  const department = departments[category];
  const priorityReason = priority === "critical" ? "Immediate attention is required." : priority === "high" ? "The student is blocked from learning." : "The issue requires support review.";
  const timeline = [
    { type: "created", status, message: "Support request created.", actor: "system", createdAt },
  ];
  if (resolvedAt) timeline.push({ type: "resolved", status, message: "Ticket resolved by support.", actor: "admin", createdAt: resolvedAt });

  const ticket = {
    uid,
    studentName,
    ticketNumber: `ADT-SEED-${id.toUpperCase()}`,
    courseId: null,
    courseTitle: null,
    originalMessage: message,
    category,
    priority,
    priorityReason,
    department,
    sentiment,
    summary: message,
    aiSuggestedReply: reply,
    aiConfidence: fallback ? 0 : 0.86,
    language: "en",
    duplicateOfTicketId: null,
    triageSource: fallback ? "fallback" : "ai",
    status,
    escalated,
    escalationReason: escalated ? priorityReason : null,
    slaDueAt: timestampFromMs(now + (priority === "critical" ? 4 : priority === "high" ? 12 : 24) * 3600000),
    adminResponse: resolvedAt ? reply : null,
    aiDraftUsed: !fallback && random() < 0.6,
    satisfaction: null,
    createdAt,
    updatedAt: resolvedAt ?? createdAt,
    resolvedAt,
    timeline,
  };
  return [
    doc("tickets", id, ticket),
    doc("ticketInternal", id, {
      aiInternalNote: internalNote,
      triageModel: fallback ? "fallback" : "seed-demo-model",
      triageLatencyMs: fallback ? 0 : 640 + Math.floor(random() * 700),
      fallbackReason: fallback ? "Seeded fallback triage example." : null,
    }),
  ];
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
