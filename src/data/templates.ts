import { Deck } from "../types";

export const TEMPLATE_DECKS: Deck[] = [
  {
    id: "template-js-basics",
    name: "Modern JavaScript Concepts",
    description: "Master the core pillars of JS, including closures, prototypes, event loop, and modern syntax.",
    createdAt: new Date().toISOString(),
    cards: [
      {
        id: "js-1",
        front: "What is a closure in JavaScript?",
        back: "A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). In other words, a closure gives an inner function access to the outer function's scope even after the outer function has returned.",
        hint: "It 'closes over' variables from its birth scope.",
        tags: ["JavaScript", "Scope", "Closures"],
        difficulty: "medium",
        reviewCount: 0
      },
      {
        id: "js-2",
        front: "Explain the difference between '==' and '===' operators.",
        back: "'==' (loose equality) performs type coercion before comparing two values, converting them to a common type. '===' (strict equality) compares both the value and the type, returning true only if both are identical without coercion.",
        hint: "One cares about types, the other converts them.",
        tags: ["JavaScript", "Operators", "Basics"],
        difficulty: "easy",
        reviewCount: 0
      },
      {
        id: "js-3",
        front: "What is the Event Loop?",
        back: "The Event Loop is a mechanism that allows JavaScript to perform non-blocking I/O operations despite being single-threaded. It constantly monitors the Call Stack and the Callback Queue; if the Call Stack is empty, it pushes the first task from the queue onto the stack.",
        hint: "It orchestrates asynchronous execution in the browser.",
        tags: ["JavaScript", "Asynchronous", "Event Loop"],
        difficulty: "hard",
        reviewCount: 0
      },
      {
        id: "js-4",
        front: "What is the difference between 'var', 'let', and 'const'?",
        back: "'var' is function-scoped, hoisted, and can be redeclared. 'let' and 'const' are block-scoped (inside {}) and not redeclared in the same scope. 'const' variables cannot be reassigned after declaration, whereas 'let' variables can.",
        hint: "Think about scope hoisting and reassignment limits.",
        tags: ["JavaScript", "Basics", "Variables"],
        difficulty: "easy",
        reviewCount: 0
      },
      {
        id: "js-5",
        front: "What is a Promise in JavaScript?",
        back: "A Promise is an object representing the eventual completion (or failure) of an asynchronous operation and its resulting value. It exists in one of three states: Pending, Fulfilled, or Rejected.",
        hint: "A placeholder for a future value.",
        tags: ["JavaScript", "Asynchronous", "Promises"],
        difficulty: "medium",
        reviewCount: 0
      }
    ]
  },
  {
    id: "template-spanish-vocab",
    name: "Medical Terminology basics",
    description: "Learn essential medical prefixes, suffixes, and terminology for healthcare contexts.",
    createdAt: new Date().toISOString(),
    cards: [
      {
        id: "med-1",
        front: "What does the prefix 'Brady-' mean?",
        back: "Slow. For example, bradycardia refers to a slow heart rate (typically under 60 beats per minute).",
        hint: "Opposite of 'Tachy-'",
        tags: ["Medical", "Prefixes", "Anatomy"],
        difficulty: "easy",
        reviewCount: 0
      },
      {
        id: "med-2",
        front: "Define the suffix '-itis'.",
        back: "Inflammation. For example, tonsillitis is inflammation of the tonsils, and arthritis is inflammation of the joints.",
        hint: "Commonly used in diseases showing swelling or redness.",
        tags: ["Medical", "Suffixes"],
        difficulty: "easy",
        reviewCount: 0
      },
      {
        id: "med-3",
        front: "What is the medical term for high blood pressure?",
        back: "Hypertension. (Hypotension refers to low blood pressure).",
        hint: "Starts with 'Hyper-' (above normal).",
        tags: ["Medical", "Cardiology"],
        difficulty: "easy",
        reviewCount: 0
      },
      {
        id: "med-4",
        front: "What is the function of 'Erythrocytes'?",
        back: "Red blood cells responsible for carrying oxygen from the lungs to the rest of the body and returning carbon dioxide to be exhaled.",
        hint: "They give blood its color.",
        tags: ["Medical", "Hematology", "Biology"],
        difficulty: "medium",
        reviewCount: 0
      },
      {
        id: "med-5",
        front: "What does 'Myocardial Infarction' refer to?",
        back: "A heart attack. It occurs when blood flow decreases or stops to a part of the heart, causing damage to the heart muscle.",
        hint: "Literally relates to heart muscle ('myo' + 'cardial') and tissue death ('infarction').",
        tags: ["Medical", "Cardiology"],
        difficulty: "medium",
        reviewCount: 0
      }
    ]
  }
];
