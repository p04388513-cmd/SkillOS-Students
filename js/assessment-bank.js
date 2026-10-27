// ============================================================
//  SkillOS — Assessment Question Bank (shared by browser + server)
// ============================================================

export const PASS_THRESHOLD = 70;
export const XP_PASS = 150;
export const XP_PARTICIPATION = 40;

// Interrelationship map between Courses and Assessments
export const COURSE_ASSESSMENT_MAP = {
  'course-py': 'python',
  'course-web': 'uiux',
  'course-ai': 'ai-ml',
  'course-js': 'javascript',
  'course-cloud': 'cloud',
  'course-sec': 'security'
};

export const ASSESSMENT_COURSE_MAP = {
  'python': 'course-py',
  'uiux': 'course-web',
  'ai-ml': 'course-ai',
  'javascript': 'course-js',
  'cloud': 'course-cloud',
  'security': 'course-sec',
  'pandas': 'course-py'
};

export const ASSESSMENT_DATA = {
  python: {
    id: 'python',
    courseId: 'course-py',
    courseTitle: 'Python Programming Essentials',
    title: 'Python Beginners Diagnostic',
    icon: '🐍',
    category: 'Programming',
    level: 'Beginner',
    accent: '#16A34A',
    accentBg: 'var(--primary-100)',
    description: 'Test variables, syntax, logic loops, and custom function definitions.',
    topics: ['Data types', 'Slicing', 'Functions', 'Lists', 'Truthiness'],
    durationSeconds: 20 * 60,
    questions: [
      {
        question: 'What is the output of the following Python expression?',
        code: 'print(type([1, "2", 3.0]))',
        options: [
          "<class 'tuple'>",
          "<class 'list'>",
          "<class 'dict'>",
          "<class 'array'>"
        ],
        answer: 1,
        explanation: 'Square brackets [] declare a list in Python, which is a mutable and heterogenous sequence.'
      },
      {
        question: 'Which of the following is the valid syntax to define a function in Python?',
        code: null,
        options: [
          'function calculateTotal():',
          'def calculateTotal():',
          'create calculateTotal():',
          'func calculateTotal(){}'
        ],
        answer: 1,
        explanation: 'In Python, functions are defined using the def keyword followed by the function name, arguments in parentheses, and a colon.'
      },
      {
        question: 'What will be the output of this negative slicing operation?',
        code: 'fruits = ["apple", "banana", "cherry", "mango"]\nprint(fruits[-1])',
        options: [
          'apple',
          'cherry',
          'mango',
          'IndexError'
        ],
        answer: 2,
        explanation: 'Negative indexing in Python indexes from the end of the collection; -1 corresponds to the final element ("mango").'
      },
      {
        question: 'How do you add an element to the end of a list named students?',
        code: null,
        options: [
          'students.add("Sarah")',
          'students.push("Sarah")',
          'students.append("Sarah")',
          'students.insert_end("Sarah")'
        ],
        answer: 2,
        explanation: 'The append() method in Python appends an item to the end of an existing list.'
      },
      {
        question: 'What is the result of evaluating bool(0) and bool("Hello") in Python?',
        code: null,
        options: [
          'True and True',
          'False and False',
          'False and True',
          'True and False'
        ],
        answer: 2,
        explanation: '0 evaluates to False because it is numeric zero, while non-empty strings like "Hello" evaluate to True.'
      }
    ]
  },

  uiux: {
    id: 'uiux',
    courseId: 'course-web',
    courseTitle: 'Responsive Web Design',
    title: 'UI/UX & Web Layout Concepts',
    icon: '🎨',
    category: 'Design',
    level: 'Beginner',
    accent: '#D97706',
    accentBg: 'var(--warning-bg)',
    description: 'Test visual hierarchy principles, CSS layout, accessibility, and Gestalt grouping.',
    topics: ['60-30-10 rule', 'Touch targets', 'Gestalt', 'Hierarchy', 'Contrast'],
    durationSeconds: 15 * 60,
    questions: [
      {
        question: 'In digital UI design, what does the 60-30-10 rule dictate?',
        code: null,
        options: [
          'Typography scale ratios between Heading, Subhead, and Body',
          'Color distribution: 60% dominant hue, 30% surface/secondary, 10% accent',
          'Layout split between Sidebar, Content Canvas, and Action Panel',
          'Time allocation during sprint planning phases'
        ],
        answer: 1,
        explanation: 'The 60-30-10 rule creates balanced visual hierarchy by maintaining 60% neutral/dominant canvas, 30% structural surface, and 10% vibrant accent.'
      },
      {
        question: 'What is the recommended minimum interactive touch target size under WCAG and Apple HIG guidelines?',
        code: null,
        options: [
          '24 × 24 px',
          '32 × 32 px',
          '44 × 44 px (or 48 × 48 dp)',
          '64 × 64 px'
        ],
        answer: 2,
        explanation: 'A minimum touch target of 44×44 points/pixels prevents user mis-taps and complies with accessibility guidelines.'
      },
      {
        question: 'Which Gestalt principle explains why elements close to one another are perceived as belonging together?',
        code: null,
        options: [
          'Law of Similarity',
          'Law of Proximity',
          'Law of Continuity',
          'Law of Common Region'
        ],
        answer: 1,
        explanation: 'The Law of Proximity states that objects positioned near each other are grouped mentally by the human eye.'
      },
      {
        question: 'What is the primary role of "Visual Hierarchy" on a web page?',
        code: null,
        options: [
          'Increasing the size of all text so everything is equally bold',
          'Guiding the user attention smoothly through elements in order of importance',
          'Stacking DOM elements in strict numerical z-index orders',
          'Ensuring every button uses the same primary color'
        ],
        answer: 1,
        explanation: 'Visual hierarchy uses contrast, size, spacing, and weight to guide users intuitively to key actions and headers first.'
      },
      {
        question: 'What is the minimum WCAG AA contrast ratio required for standard body text against its background?',
        code: null,
        options: [
          '2.5 : 1',
          '3.0 : 1',
          '4.5 : 1',
          '7.0 : 1'
        ],
        answer: 2,
        explanation: 'WCAG 2.1 AA mandates a minimum contrast ratio of 4.5:1 for regular text and 3:1 for large text.'
      }
    ]
  },

  'ai-ml': {
    id: 'ai-ml',
    courseId: 'course-ai',
    courseTitle: 'Machine Learning Foundations',
    title: 'Machine Learning & AI Diagnostic',
    icon: '🤖',
    category: 'AI & Data',
    level: 'Advanced',
    accent: '#8B5CF6',
    accentBg: 'rgba(139, 92, 246, 0.1)',
    description: 'Verify mathematical foundations of loss functions, neural networks, and model training.',
    topics: ['Gradient Descent', 'Loss Functions', 'Overfitting', 'Neural Nets', 'Transformers'],
    durationSeconds: 20 * 60,
    questions: [
      {
        question: 'What is the primary optimization goal of Gradient Descent during model training?',
        code: 'w = w - learning_rate * gradient',
        options: [
          'Maximize the model inference latency',
          'Iteratively adjust weights to minimize the loss function',
          'Increase the total parameter count in the neural network',
          'Normalize the training dataset values between 0 and 1'
        ],
        answer: 1,
        explanation: 'Gradient descent calculates the gradient of the loss function with respect to weights and updates weights in the negative gradient direction to find a minimum loss.'
      },
      {
        question: 'Which phenomenon occurs when a model performs exceptionally well on training data but poorly on unseen test data?',
        code: null,
        options: [
          'Underfitting',
          'Overfitting (High Variance)',
          'Vanishing Gradient',
          'Data Drift'
        ],
        answer: 1,
        explanation: 'Overfitting happens when a model learns noise and specific details of the training set instead of generalized underlying patterns.'
      },
      {
        question: 'What is the purpose of an Activation Function (e.g. ReLU, Sigmoid) in an artificial neural network?',
        code: null,
        options: [
          'To introduce non-linearity so the network can learn complex arbitrary functions',
          'To compress the model weights into an 8-bit integer',
          'To clean corrupt CSV input records before training',
          'To randomly deactivate 50% of the neurons during inference'
        ],
        answer: 0,
        explanation: 'Without non-linear activation functions, stacked linear layers collapse into a single linear equation, unable to model complex relationships.'
      },
      {
        question: 'In modern Transformer models (like Gemini and GPT), what key mechanism allows tokens to relate across long contexts?',
        code: null,
        options: [
          'Recurrent Hidden Markov Chains',
          'Self-Attention Mechanism',
          'Convolutional Kernel Stride',
          'Random Forest Bagging'
        ],
        answer: 1,
        explanation: 'The Self-Attention mechanism allows each token in a sequence to dynamically weigh and attend to every other token regardless of distance.'
      },
      {
        question: 'Which metric is best suited to evaluate classification models on highly imbalanced datasets (e.g. fraud detection)?',
        code: null,
        options: [
          'Raw Accuracy',
          'Precision, Recall & F1-Score',
          'Mean Squared Error (MSE)',
          'R-Squared Variance'
        ],
        answer: 1,
        explanation: 'Accuracy is misleading on imbalanced sets (e.g., 99% accuracy by predicting only non-fraud). Precision and Recall provide genuine insight.'
      }
    ]
  },

  javascript: {
    id: 'javascript',
    courseId: 'course-js',
    courseTitle: 'Modern JavaScript Deep Dive',
    title: 'Modern JavaScript & ES6+ Diagnostic',
    icon: '⚡',
    category: 'Programming',
    level: 'Intermediate',
    accent: '#EAB308',
    accentBg: 'rgba(234, 179, 8, 0.1)',
    description: 'Test closures, asynchronous promises, scopes, and modern ES6+ paradigms.',
    topics: ['Event Loop', 'Closures', 'Promises', 'Destructuring', 'Prototypes'],
    durationSeconds: 20 * 60,
    questions: [
      {
        question: 'What will be printed to the console?',
        code: 'console.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);',
        options: [
          '1, 2, 3, 4',
          '1, 4, 3, 2',
          '1, 4, 2, 3',
          '4, 1, 3, 2'
        ],
        answer: 1,
        explanation: 'Synchronous logs (1, 4) run first. Microtasks (Promise then: 3) run before Macrotasks (setTimeout: 2).'
      },
      {
        question: 'In JavaScript, what constitutes a "Closure"?',
        code: null,
        options: [
          'A function bundled together with references to its surrounding lexical environment',
          'A syntax error that prevents code execution',
          'A method to terminate a while loop prematurely',
          'An encrypted JSON object stored in localStorage'
        ],
        answer: 0,
        explanation: 'A closure gives an inner function access to an outer function’s scope even after the outer function has returned.'
      },
      {
        question: 'What is the fundamental difference between "const" and "let" in ES6?',
        code: null,
        options: [
          'const is function-scoped; let is block-scoped',
          'const variables cannot be reassigned; let variables can be reassigned',
          'const is hoisted to the top; let is not',
          'let values are immutable deep copies'
        ],
        answer: 1,
        explanation: 'const creates a block-scoped variable whose binding cannot be reassigned (though object properties can still mutate).'
      },
      {
        question: 'What does the Array.prototype.reduce() method do?',
        code: null,
        options: [
          'Reduces the length of an array by truncating elements',
          'Executes a reducer function on each element, resulting in a single output value',
          'Sorts an array in descending order',
          'Filters out falsey values from the array'
        ],
        answer: 1,
        explanation: 'reduce() executes a user-supplied reducer callback on each element of the array, returning a single accumulated value.'
      },
      {
        question: 'What is the output of typeof NaN in JavaScript?',
        code: 'console.log(typeof NaN);',
        options: [
          '"undefined"',
          '"nan"',
          '"number"',
          '"object"'
        ],
        answer: 2,
        explanation: 'In JavaScript, NaN (Not-a-Number) is of numeric type according to the IEEE 754 floating-point standard.'
      }
    ]
  },

  cloud: {
    id: 'cloud',
    courseId: 'course-cloud',
    courseTitle: 'Cloud Architecture & DevOps',
    title: 'Cloud Architecture & DevOps Exam',
    icon: '☁️',
    category: 'Cloud',
    level: 'Intermediate',
    accent: '#0284C7',
    accentBg: 'rgba(2, 132, 199, 0.1)',
    description: 'Containers, Kubernetes concepts, CI/CD automation, and cloud scaling.',
    topics: ['Docker', 'Kubernetes', 'CI/CD', 'Microservices', 'IaC'],
    durationSeconds: 20 * 60,
    questions: [
      {
        question: 'What is the primary architectural difference between a Docker container and a traditional Virtual Machine?',
        code: null,
        options: [
          'Containers virtualize hardware and each require their own guest OS kernel',
          'Containers share the host OS kernel and isolate at process level, making them lightweight',
          'Virtual Machines cannot run Linux workloads',
          'Containers can only run within web browsers'
        ],
        answer: 1,
        explanation: 'Containers package code and dependencies together sharing the host OS kernel, whereas VMs run a complete guest OS on virtualized hardware.'
      },
      {
        question: 'In Kubernetes, what is the smallest deployable computing unit that can be created and managed?',
        code: null,
        options: [
          'Node',
          'Cluster',
          'Pod',
          'Namespace'
        ],
        answer: 2,
        explanation: 'A Pod represents a single instance of a running process in your cluster and can contain one or more tightly coupled containers.'
      },
      {
        question: 'What does the term "Infrastructure as Code" (IaC) represent in DevOps?',
        code: null,
        options: [
          'Writing source code inside cloud server consoles',
          'Managing and provisioning compute infrastructure through machine-readable definition files',
          'Deploying applications without unit testing',
          'Hosting databases exclusively in local text files'
        ],
        answer: 1,
        explanation: 'Tools like Terraform and CloudFormation allow engineers to version-control, repeat, and automate infrastructure deployments.'
      },
      {
        question: 'In Continuous Integration (CI), what practice is universally considered essential?',
        code: null,
        options: [
          'Merging code only once per quarter',
          'Automatically building and running automated unit tests on every code commit',
          'Deploying directly to production without testing',
          'Manually reviewing compiled binaries on physical servers'
        ],
        answer: 1,
        explanation: 'CI requires developers to integrate code into a shared repository frequently, verified by automated builds and test suites.'
      },
      {
        question: 'What is the function of a Load Balancer in modern web scale architecture?',
        code: null,
        options: [
          'To distribute incoming network traffic across multiple backend servers to ensure high availability',
          'To compress video files uploaded by clients',
          'To enforce SSL encryption on local database disks',
          'To block all outgoing network connections from the cluster'
        ],
        answer: 0,
        explanation: 'Load balancers prevent single points of failure by routing traffic evenly among healthy backend server instances.'
      }
    ]
  },

  security: {
    id: 'security',
    courseId: 'course-sec',
    courseTitle: 'Cybersecurity Fundamentals',
    title: 'Cybersecurity Fundamentals Exam',
    icon: '🔒',
    category: 'Security',
    level: 'Beginner',
    accent: '#DC2626',
    accentBg: 'rgba(220, 38, 38, 0.1)',
    description: 'Verify security principles, threat mitigation, encryption, and secure coding.',
    topics: ['CIA Triad', 'SQL Injection', 'TLS/SSL', 'MFA', 'XSS'],
    durationSeconds: 18 * 60,
    questions: [
      {
        question: 'What are the three pillars of the foundational "CIA Triad" in information security?',
        code: null,
        options: [
          'Centralization, Inspection, Authentication',
          'Confidentiality, Integrity, Availability',
          'Cryptography, Identity, Authorization',
          'Compliance, Incident, Audit'
        ],
        answer: 1,
        explanation: 'Confidentiality (privacy), Integrity (data accuracy), and Availability (system uptime) form the core CIA security model.'
      },
      {
        question: 'How do software developers prevent SQL Injection vulnerabilities in web applications?',
        code: null,
        options: [
          'Using Parameterized Queries (Prepared Statements)',
          'Disabling all SQL database user permissions',
          'Encoding the user password in Base64',
          'Storing database credentials in client-side cookies'
        ],
        answer: 0,
        explanation: 'Parameterized queries separate SQL code from user-supplied input data, rendering malicious SQL injections harmless.'
      },
      {
        question: 'In Asymmetric (Public-Key) Cryptography, what is used to decrypt a message encrypted with a Public Key?',
        code: null,
        options: [
          'The same Public Key',
          'The recipient’s corresponding Private Key',
          'A shared symmetric secret password',
          'An MD5 hashing function'
        ],
        answer: 1,
        explanation: 'Data encrypted with a recipient’s public key can only be decrypted by the recipient’s strictly private key.'
      },
      {
        question: 'What type of vulnerability occurs when an application includes untrusted data in an HTTP response without proper encoding, executing scripts in user browsers?',
        code: null,
        options: [
          'Cross-Site Scripting (XSS)',
          'Denial of Service (DoS)',
          'Buffer Overflow',
          'ARP Spoofing'
        ],
        answer: 0,
        explanation: 'Cross-Site Scripting (XSS) lets attackers execute malicious client-side scripts inside victim browsers.'
      },
      {
        question: 'Which factor combination represents genuine Multi-Factor Authentication (MFA)?',
        code: null,
        options: [
          'A password and a repeated confirmation of that password',
          'A password (something you know) and an authenticator OTP code (something you have)',
          'Two different email addresses belonging to the same user',
          'A username and an IP address'
        ],
        answer: 1,
        explanation: 'MFA requires two or more distinct categories: knowledge (password), possession (phone/key), or inherence (biometrics).'
      }
    ]
  },

  pandas: {
    id: 'pandas',
    courseId: 'course-py',
    courseTitle: 'Python Programming Essentials',
    title: 'Pandas & Data Cleaning Diagnostic',
    icon: '📊',
    category: 'Data Science',
    level: 'Intermediate',
    accent: '#2563EB',
    accentBg: 'var(--info-bg)',
    description: 'Verify your DataFrame structures, indexing, and data cleaning operations.',
    topics: ['.loc / .iloc', 'dropna()', 'shape', 'head()', 'groupby()'],
    durationSeconds: 18 * 60,
    questions: [
      {
        question: 'In Pandas, what is the fundamental difference between .loc and .iloc?',
        code: null,
        options: [
          '.loc uses label-based indexing; .iloc uses integer position-based indexing',
          '.loc operates on Columns; .iloc operates on Rows',
          '.loc modifies data in-place; .iloc returns a deep copy',
          '.iloc is restricted to numerical data types only'
        ],
        answer: 0,
        explanation: '.loc accesses rows and columns by their labels/index names, while .iloc accesses by numerical integer offsets (0 to n-1).'
      },
      {
        question: 'Which method removes missing or NaN records from a DataFrame?',
        code: 'clean_df = df._______()',
        options: [
          'delete_null',
          'dropna',
          'strip_na',
          'remove_empty'
        ],
        answer: 1,
        explanation: 'df.dropna() drops rows or columns that contain NaN/null values according to the specified axis.'
      },
      {
        question: 'What is the data structure returned by df.shape for a DataFrame with 100 rows and 5 columns?',
        code: null,
        options: [
          'An integer: 500',
          'A list: [100, 5]',
          'A tuple: (100, 5)',
          'A dictionary: {"rows": 100, "cols": 5}'
        ],
        answer: 2,
        explanation: 'df.shape is a tuple of (n_rows, n_columns).'
      },
      {
        question: 'How do you preview the first 5 rows of a Pandas DataFrame?',
        code: null,
        options: [
          'df.first(5)',
          'df.head(5)',
          'df.preview()',
          'df.slice(0, 5)'
        ],
        answer: 1,
        explanation: 'df.head(n) returns the first n rows (defaulting to 5 if no argument is passed).'
      },
      {
        question: 'Which Pandas operation groups rows by category values to perform aggregated statistics?',
        code: null,
        options: [
          'df.aggregate_by()',
          'df.groupby()',
          'df.cluster()',
          'df.partition()'
        ],
        answer: 1,
        explanation: 'df.groupby() splits the data into groups based on column values to compute aggregates like mean, sum, or count.'
      }
    ]
  }
};

// Grade a set of answers against the bank (same logic on client and server)
export function gradeAssessment(test, answers) {
  const total = test.questions.length;
  const correct = test.questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const score = Math.round((correct / total) * 100);
  const passed = score >= PASS_THRESHOLD;
  return { total, correct, score, passed, xp: passed ? XP_PASS : XP_PARTICIPATION };
}
