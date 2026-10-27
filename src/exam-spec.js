export const BANK_VERSION = 'foundation-2026-10-26-v1';
export const EXAM = { questions: 26, minutes: 60, pass: 19, language: 'English', checked: '26 October 2026', syllabus: 'RSGB v1.6b, March 2026' };
export const SECTIONS = [
  { id: '1', name: 'Licensing and identification', count: 6 },
  { id: '2', name: 'Technical aspects', count: 3 },
  { id: '3', name: 'Transmitters and receivers', count: 3 },
  { id: '4', name: 'Feeders and antennas', count: 3 },
  { id: '5', name: 'Propagation', count: 2 },
  { id: '6', name: 'Electromagnetic compatibility', count: 3 },
  { id: '7', name: 'Operating practices', count: 3 },
  { id: '8', name: 'Safety', count: 3 },
];
export const EXAM_SOURCES = {
  syllabus: 'https://rsgb.services/public/exams/specifications/260305_Syllabus_2024_v1.6b.pdf',
  reference: 'https://rsgb.services/public/exams/exam-forms/260122_EX307_Foundation_v1.pdf',
  referenceLocal: '/reference/ex307-jan-2026.pdf',
  referenceData: '/reference/ex307-jan-2026.json',
  officialMocks: 'https://rsgb.org/main/clubs-training/training-resources/mock-exams/',
  papers: [1, 2, 3].map(number => `https://rsgb.services/public/exams/mock-exams/260430_Foundation_Mock_0${number}_V1.6b.pdf`),
};
