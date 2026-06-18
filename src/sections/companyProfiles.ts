import krishnaImage from "../assets/images/founders/krishna.jpeg";
import suyashImage from "../assets/images/founders/suyash.jpeg";
import yashImage from "../assets/images/founders/yash.jpeg";

export interface CompanyProfile {
  name: string;
  role: string;
  image: string;
  imagePosition?: string;
  initials: string;
  linkedin: string;
  accent: string;
  bio: string;
  detailedBio: string;
  experience: string;
  education?: string;
  expertise: string[];
}

export const companyProfiles: CompanyProfile[] = [
  {
    name: "Snehil Srivastava",
    role: "Founder & CEO",
    image: yashImage,
    imagePosition: "center 38%",
    initials: "YS",
    linkedin: "https://www.linkedin.com/in/snehil-srivastava-a737861a9/",
    accent: "from-[#145DFF] via-[#20D7FF] to-[#0B3FCC]",
    bio: "Leading strategy, growth, and business innovation at Adviso.",
    detailedBio:
      "Business leader with expertise in business analytics, marketing strategy, supply chain management, and organizational growth. Currently pursuing an MBA and backed by a strong foundation in law and business operations, Snehil leads Adviso's vision, partnerships, and growth initiatives while driving data-informed decision-making across the organization.",
    experience:
      "Business analytics, marketing strategy, supply chain management, organizational growth, partnerships, and data-informed operating strategy.",
    education: "Currently pursuing an MBA, backed by a foundation in law and business operations.",
    expertise: [
      "Business analytics",
      "Marketing strategy",
      "Supply chain management",
      "Organizational growth",
      "Strategic partnerships",
    ],
  },
  {
    name: "Krishna Porwal",
    role: "Co-Founder & Chief Technology Officer",
    image: krishnaImage,
    imagePosition: "center 34%",
    initials: "KP",
    linkedin: "https://www.linkedin.com/in/krishna-porwal-182160160/",
    accent: "from-[#0B3FCC] via-[#145DFF] to-[#7C3AED]",
    bio: "Building AI-powered products with expertise in ML, GenAI, and scalable systems.",
    detailedBio:
      "Technology leader with 5+ years of experience in Data Science, Artificial Intelligence, Machine Learning, Generative AI, and Full-Stack Development. Krishna leads product architecture, AI innovation, and platform engineering, building scalable solutions that transform complex business challenges into intelligent digital products.",
    experience:
      "5+ years across Data Science, Artificial Intelligence, Machine Learning, Generative AI, full-stack development, and scalable platform engineering.",
    expertise: [
      "Data Science",
      "Artificial Intelligence",
      "Machine Learning",
      "Generative AI",
      "Full-stack development",
      "Scalable systems",
    ],
  },
  {
    name: "Suyash Jain",
    role: "Co-Founder & Chief Security Officer",
    image: suyashImage,
    imagePosition: "center 36%",
    initials: "SJ",
    linkedin: "https://www.linkedin.com/in/suyash-jain-in/",
    accent: "from-[#145DFF] via-[#0B3FCC] to-[#20D7FF]",
    bio: "Ensuring platform security, compliance, and data protection.",
    detailedBio:
      "Cybersecurity professional with 4+ years of experience in information security, threat analysis, risk assessment, security operations, and cyber defense. Suyash oversees security strategy, compliance, and data protection, ensuring that Adviso maintains a secure and trusted environment for its customers and partners.",
    experience:
      "4+ years in information security, threat analysis, risk assessment, security operations, cyber defense, and compliance strategy.",
    expertise: [
      "Information security",
      "Threat analysis",
      "Risk assessment",
      "Security operations",
      "Cyber defense",
      "Compliance",
    ],
  },
];
