const mongoose = require('mongoose');
const Skill = require('../models/Skill');

const skillCategories = {
  programming: {
    icon: '💻',
    skills: [
      { name: 'javascript', displayName: 'JavaScript', subcategory: 'Web Development', aliases: ['js', 'ecmascript'] },
      { name: 'python', displayName: 'Python', subcategory: 'Backend', aliases: ['py'] },
      { name: 'java', displayName: 'Java', subcategory: 'Backend', aliases: [] },
      { name: 'cpp', displayName: 'C++', subcategory: 'Systems', aliases: ['c++', 'cplusplus'] },
      { name: 'react', displayName: 'React', subcategory: 'Frontend', aliases: ['reactjs', 'react.js'] },
      { name: 'nodejs', displayName: 'Node.js', subcategory: 'Backend', aliases: ['node', 'node.js'] },
      { name: 'html_css', displayName: 'HTML/CSS', subcategory: 'Web Basics', aliases: ['html', 'css', 'web design'] },
      { name: 'sql', displayName: 'SQL', subcategory: 'Database', aliases: ['mysql', 'postgresql', 'database'] },
      { name: 'git', displayName: 'Git', subcategory: 'Tools', aliases: ['github', 'version control'] }
    ]
  },
  design: {
    icon: '🎨',
    skills: [
      { name: 'ui_ux', displayName: 'UI/UX Design', subcategory: 'Digital', aliases: ['ui', 'ux', 'user interface'] },
      { name: 'graphic_design', displayName: 'Graphic Design', subcategory: 'Visual', aliases: ['photoshop', 'illustrator'] },
      { name: 'figma', displayName: 'Figma', subcategory: 'Tools', aliases: ['prototyping'] },
      { name: 'photography', displayName: 'Photography', subcategory: 'Visual', aliases: ['photo', 'camera'] }
    ]
  },
  languages: {
    icon: '🗣️',
    skills: [
      { name: 'spanish', displayName: 'Spanish', subcategory: 'Romance', aliases: ['español'] },
      { name: 'french', displayName: 'French', subcategory: 'Romance', aliases: ['français'] },
      { name: 'german', displayName: 'German', subcategory: 'Germanic', aliases: ['deutsch'] },
      { name: 'chinese', displayName: 'Chinese', subcategory: 'Asian', aliases: ['mandarin', '中文'] },
      { name: 'japanese', displayName: 'Japanese', subcategory: 'Asian', aliases: ['日本語', 'nihongo'] },
      { name: 'english', displayName: 'English', subcategory: 'Germanic', aliases: ['esl'] }
    ]
  },
  music: {
    icon: '🎵',
    skills: [
      { name: 'guitar', displayName: 'Guitar', subcategory: 'Instruments', aliases: ['acoustic', 'electric guitar'] },
      { name: 'piano', displayName: 'Piano', subcategory: 'Instruments', aliases: ['keyboard'] },
      { name: 'singing', displayName: 'Singing', subcategory: 'Vocal', aliases: ['vocals', 'voice'] },
      { name: 'music_theory', displayName: 'Music Theory', subcategory: 'Theory', aliases: ['composition'] },
      { name: 'drums', displayName: 'Drums', subcategory: 'Instruments', aliases: ['percussion'] }
    ]
  },
  sports: {
    icon: '⚽',
    skills: [
      { name: 'swimming', displayName: 'Swimming', subcategory: 'Water', aliases: [] },
      { name: 'yoga', displayName: 'Yoga', subcategory: 'Fitness', aliases: ['meditation'] },
      { name: 'basketball', displayName: 'Basketball', subcategory: 'Team', aliases: [] },
      { name: 'tennis', displayName: 'Tennis', subcategory: 'Racket', aliases: [] },
      { name: 'running', displayName: 'Running', subcategory: 'Fitness', aliases: ['jogging'] }
    ]
  },
  academic: {
    icon: '📖',
    skills: [
      { name: 'mathematics', displayName: 'Mathematics', subcategory: 'STEM', aliases: ['math', 'calculus', 'algebra'] },
      { name: 'physics', displayName: 'Physics', subcategory: 'STEM', aliases: [] },
      { name: 'chemistry', displayName: 'Chemistry', subcategory: 'STEM', aliases: [] },
      { name: 'biology', displayName: 'Biology', subcategory: 'STEM', aliases: [] },
      { name: 'essay_writing', displayName: 'Essay Writing', subcategory: 'Writing', aliases: ['writing', 'academic writing'] }
    ]
  },
  arts_crafts: {
    icon: '✂️',
    skills: [
      { name: 'drawing', displayName: 'Drawing', subcategory: 'Visual', aliases: ['sketching', 'illustration'] },
      { name: 'painting', displayName: 'Painting', subcategory: 'Visual', aliases: ['watercolor', 'oil painting'] },
      { name: 'knitting', displayName: 'Knitting', subcategory: 'Textile', aliases: ['crochet'] },
      { name: 'woodworking', displayName: 'Woodworking', subcategory: 'Craft', aliases: ['carpentry'] }
    ]
  },
  business: {
    icon: '💼',
    skills: [
      { name: 'public_speaking', displayName: 'Public Speaking', subcategory: 'Soft Skills', aliases: ['presentation'] },
      { name: 'excel', displayName: 'Microsoft Excel', subcategory: 'Tools', aliases: ['spreadsheets'] },
      { name: 'marketing', displayName: 'Marketing', subcategory: 'Business', aliases: ['digital marketing'] },
      { name: 'accounting', displayName: 'Accounting', subcategory: 'Finance', aliases: ['bookkeeping'] }
    ]
  },
  cooking: {
    icon: '🍳',
    skills: [
      { name: 'baking', displayName: 'Baking', subcategory: 'Culinary', aliases: ['pastry'] },
      { name: 'italian_cooking', displayName: 'Italian Cooking', subcategory: 'Cuisine', aliases: ['pasta making'] },
      { name: 'meal_prep', displayName: 'Meal Prep', subcategory: 'Health', aliases: ['nutrition'] }
    ]
  }
};

const seedSkills = async () => {
  try {
    // Clear existing
    await Skill.deleteMany({});
    
    const skillsToInsert = [];
    
    for (const [category, data] of Object.entries(skillCategories)) {
      for (const skill of data.skills) {
        skillsToInsert.push({
          name: skill.name,
          displayName: skill.displayName,
          category,
          subcategory: skill.subcategory,
          aliases: skill.aliases,
          icon: data.icon
        });
      }
    }
    
    await Skill.insertMany(skillsToInsert);
    console.log(`✅ Seeded ${skillsToInsert.length} skills`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

module.exports = seedSkills;

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../config/db');
  connectDB().then(() => seedSkills());
}
