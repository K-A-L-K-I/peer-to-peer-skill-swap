const Skill = require('../models/Skill');

const getAllSkills = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = { isActive: true };
    
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { aliases: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skills = await Skill.find(filter).sort({ category: 1, popularity: -1 });
    
    // Group by category
    const grouped = skills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = {
          icon: skill.icon,
          skills: []
        };
      }
      acc[skill.category].skills.push(skill);
      return acc;
    }, {});

    return res.status(200).json({
      count: skills.length,
      categories: grouped
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await Skill.distinct('category');
    const categoryData = await Skill.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: '$category', 
        icon: { $first: '$icon' },
        count: { $sum: 1 },
        subcategories: { $addToSet: '$subcategory' }
      }}
    ]);
    
    return res.status(200).json({
      categories: categoryData.map(c => ({
        id: c._id,
        icon: c.icon,
        count: c.count,
        subcategories: c.subcategories
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const incrementPopularity = async (skillNames) => {
  try {
    await Skill.updateMany(
      { name: { $in: skillNames.map(s => s.toLowerCase()) } },
      { $inc: { popularity: 1 } }
    );
  } catch (error) {
    console.error('Failed to update popularity:', error);
  }
};

module.exports = {
  getAllSkills,
  getCategories,
  incrementPopularity
};
