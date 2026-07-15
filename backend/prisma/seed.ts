import { PrismaClient, CurriculumCategory } from "@prisma/client";

const prisma = new PrismaClient();

const CURRICULUM: {
  order: number;
  title: string;
  category: CurriculumCategory;
  lessons: { order: number; title: string; objective: string; content: string }[];
}[] = [
  {
    order: 1,
    title: "Number Sense: Counting & Recognition",
    category: "NUMBER_SENSE",
    lessons: [
      {
        order: 1,
        title: "Counting 1 to 10",
        objective: "Count objects one-to-one from 1 to 10 and recognize the written digits.",
        content:
          "Introduce numbers 1-10 using everyday objects (fingers, toys, fruit). Practice counting aloud together, then show the written digit for each number and have the child match it to a group of objects.",
      },
      {
        order: 2,
        title: "Counting 11 to 100",
        objective: "Count by ones from 11 to 100, recognizing patterns in tens.",
        content:
          "Build on 1-10 by introducing the teen numbers, then counting by tens (10, 20, 30...) before filling in the ones between. Emphasize the repeating pattern of digits.",
      },
      {
        order: 3,
        title: "Skip Counting by 2s, 5s, and 10s",
        objective: "Skip count by 2, 5, and 10 up to 100.",
        content:
          "Use a hundred chart or number line. Highlight every 2nd/5th/10th number and have the child say the sequence aloud, connecting it to counting groups of objects.",
      },
    ],
  },
  {
    order: 2,
    title: "Basic Arithmetic: Addition & Subtraction",
    category: "ARITHMETIC",
    lessons: [
      {
        order: 1,
        title: "Single-Digit Addition",
        objective: "Add two single-digit numbers with sums up to 10 using objects or fingers.",
        content:
          "Use physical or visual objects to combine two small groups and count the total. Progress to simple number sentences like 3 + 2 = 5.",
      },
      {
        order: 2,
        title: "Single-Digit Subtraction",
        objective: "Subtract a single-digit number from another with a result of 0-9.",
        content:
          "Start with a group of objects, remove some, and count what's left. Connect to number sentences like 5 - 2 = 3.",
      },
      {
        order: 3,
        title: "Simple Multiplication (Groups of Objects)",
        objective: "Understand multiplication as repeated addition using small equal groups (up to 5x5).",
        content:
          "Introduce multiplication as 'groups of' — e.g. 3 groups of 2 apples is the same as 2+2+2. Use objects arranged " +
          "in equal rows to show the pattern, then connect it to a simple number sentence like 3 x 2 = 6. Keep numbers " +
          "small (up to 5 groups of 5) and always ground it in something the child can see and count.",
      },
    ],
  },
  {
    order: 3,
    title: "Shapes & Patterns",
    category: "SHAPES_PATTERNS",
    lessons: [
      {
        order: 1,
        title: "Identifying Basic Shapes",
        objective: "Recognize and name circle, square, triangle, and rectangle.",
        content:
          "Show each shape and point out real-world examples (a plate is a circle, a window is a square). Have the child spot shapes around them.",
      },
      {
        order: 2,
        title: "Completing Simple Patterns",
        objective: "Identify and continue simple repeating patterns (e.g., red-blue-red-blue).",
        content:
          "Present a short pattern with shapes or colors and ask what comes next, gradually increasing pattern complexity.",
      },
    ],
  },
  {
    order: 4,
    title: "Measurement & Time",
    category: "MEASUREMENT_TIME",
    lessons: [
      {
        order: 1,
        title: "Comparing Length and Weight",
        objective: "Compare two objects as longer/shorter or heavier/lighter.",
        content:
          "Use household objects to compare directly (a pencil vs a crayon). Introduce vocabulary: longer, shorter, heavier, lighter.",
      },
      {
        order: 2,
        title: "Reading a Clock (Hour)",
        objective: "Tell time to the nearest hour on an analog clock.",
        content:
          "Introduce the clock face, the hour hand, and reading whole hours (e.g., 3 o'clock). Use a practice clock to set and read different hours.",
      },
    ],
  },
];

async function main() {
  for (const unit of CURRICULUM) {
    const createdUnit = await prisma.curriculumUnit.upsert({
      where: { order: unit.order },
      update: { title: unit.title, category: unit.category },
      create: { order: unit.order, title: unit.title, category: unit.category },
    });

    for (const lesson of unit.lessons) {
      await prisma.lesson.upsert({
        where: { unitId_order: { unitId: createdUnit.id, order: lesson.order } },
        update: {
          title: lesson.title,
          objective: lesson.objective,
          content: lesson.content,
        },
        create: {
          unitId: createdUnit.id,
          order: lesson.order,
          title: lesson.title,
          objective: lesson.objective,
          content: lesson.content,
        },
      });
    }
  }

  console.log("Seeded Grade 1 curriculum.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
