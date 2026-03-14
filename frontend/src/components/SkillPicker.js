import { useState, useEffect } from 'react';
import api from '../services/api';

import { Code, Palette, Globe, Music, Dumbbell, BookOpen, Scissors, Briefcase, ChefHat, Pin, Check, Search, X, ChevronDown } from 'lucide-react';

// Move categoryConfig outside component so SkillButton can access it
const categoryConfig = {
  programming: { icon: <Code size={18} />, label: 'Technology & Programming', color: '#2563eb' },
  design: { icon: <Palette size={18} />, label: 'Design & Creative', color: '#7c3aed' },
  languages: { icon: <Globe size={18} />, label: 'Languages', color: '#059669' },
  music: { icon: <Music size={18} />, label: 'Music & Audio', color: '#dc2626' },
  sports: { icon: <Dumbbell size={18} />, label: 'Sports & Fitness', color: '#ea580c' },
  academic: { icon: <BookOpen size={18} />, label: 'Academic & STEM', color: '#0891b2' },
  arts_crafts: { icon: <Scissors size={18} />, label: 'Arts & Crafts', color: '#db2777' },
  business: { icon: <Briefcase size={18} />, label: 'Business & Career', color: '#4f46e5' },
  cooking: { icon: <ChefHat size={18} />, label: 'Cooking & Culinary', color: '#d97706' },
  other: { icon: <Pin size={18} />, label: 'Other Skills', color: '#6b7280' }
};

// Move SkillButton outside so it's not recreated on every render
function SkillButton({ skill, isSelected, onClick, showCategory }) {
  return (
    <button
      type="button"
      className={`skill-btn-v2 ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      title={skill.aliases?.length > 0 ? `Also: ${skill.aliases.join(', ')}` : skill.displayName}
    >
      <span className="skill-name">{skill.displayName}</span>
      {showCategory && (
        <span className="skill-cat">{categoryConfig[skill.category]?.label}</span>
      )}
      {isSelected && <span className="check-icon"><Check size={16} /></span>}
    </button>
  );
}

function SkillPicker({ selectedSkills, onChange, mode = 'offer' }) {
  const [allSkills, setAllSkills] = useState([]);
  const [groupedSkills, setGroupedSkills] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState([]);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const { data } = await api.get('/skills');
      const skills = [];
      const grouped = {};

      // Flatten and group skills
      Object.entries(data.categories || {}).forEach(([category, categoryData]) => {
        grouped[category] = categoryData.skills || [];
        skills.push(...(categoryData.skills || []).map(s => ({ ...s, category })));
      });

      setAllSkills(skills);
      setGroupedSkills(grouped);
      // Removed default expansion so lists don't push the page down excessively
      setExpandedCategories([]);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skillName) => {
    const normalized = skillName.toLowerCase();
    if (selectedSkills.includes(normalized)) {
      onChange(selectedSkills.filter(s => s !== normalized));
    } else {
      onChange([...selectedSkills, normalized]);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const expandAll = () => {
    setExpandedCategories(Object.keys(groupedSkills));
  };

  const collapseAll = () => {
    setExpandedCategories([]);
  };

  const filteredSkills = searchTerm
    ? allSkills.filter(skill =>
      skill.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      skill.aliases?.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    : [];

  const selectedCount = selectedSkills.length;

  if (loading) {
    return (
      <div className="skill-picker-loading">
        <span className="spinner"></span>
        <p>Loading skills...</p>
      </div>
    );
  }

  return (
    <div className="skill-picker-v2">
      {/* Search & Controls */}
      <div className="skill-picker-header">
        <div className="skill-search-v2">
          <span className="search-icon"><Search size={18} /></span>
          <input
            type="text"
            placeholder="Search skills (e.g., 'Python', 'Guitar', 'Spanish')..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}><X size={16} /></button>
          )}
        </div>

        {!searchTerm && (
          <div className="expand-controls">
            <button type="button" onClick={expandAll}>Expand All</button>
            <span>•</span>
            <button type="button" onClick={collapseAll}>Collapse All</button>
          </div>
        )}
      </div>

      {/* Selected Skills Bar */}
      {selectedCount > 0 && (
        <div className="selected-bar">
          <span className="selected-count">{selectedCount} selected</span>
          <div className="selected-chips">
            {selectedSkills.map(skillName => {
              const skill = allSkills.find(s => s.name === skillName);
              return (
                <span
                  key={skillName}
                  className={`skill-chip ${mode}`}
                  onClick={() => toggleSkill(skillName)}
                  title="Click to remove"
                >
                  {skill?.displayName || skillName}
                  <span className="remove-icon"><X size={14} /></span>
                </span>
              );
            })}
          </div>
          <button className="clear-all" onClick={() => onChange([])}>Clear all</button>
        </div>
      )}

      {/* Search Results */}
      {searchTerm ? (
        <div className="search-results">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={18} /> Search Results
            <span className="result-count">({filteredSkills.length} found)</span>
          </h4>
          {filteredSkills.length === 0 ? (
            <p className="no-results">No skills found. Try a different search term.</p>
          ) : (
            <div className="skills-cloud">
              {filteredSkills.map(skill => (
                <SkillButton
                  key={skill.name}
                  skill={skill}
                  isSelected={selectedSkills.includes(skill.name)}
                  onClick={() => toggleSkill(skill.name)}
                  showCategory
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Category Accordions */
        <div className="categories-list">
          {Object.entries(groupedSkills).map(([category, skills]) => {
            const config = categoryConfig[category] || categoryConfig.other;
            const isExpanded = expandedCategories.includes(category);
            const selectedInCategory = skills.filter(s => selectedSkills.includes(s.name)).length;

            return (
              <div
                key={category}
                className={`category-section ${isExpanded ? 'expanded' : ''}`}
              >
                <button
                  type="button"
                  className="category-header"
                  onClick={() => toggleCategory(category)}
                  style={{ '--category-color': config.color }}
                >
                  <span className="category-icon-large">{config.icon}</span>
                  <div className="category-info">
                    <span className="category-name">{config.label}</span>
                    <span className="category-meta">
                      {skills.length} skills
                      {selectedInCategory > 0 && (
                        <span className="selected-badge">• {selectedInCategory} selected</span>
                      )}
                    </span>
                  </div>
                  <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
                    <ChevronDown size={20} />
                  </span>
                </button>

                {isExpanded && (
                  <div className="category-skills">
                    <div className="skills-grid-v2">
                      {skills.map(skill => (
                        <SkillButton
                          key={skill.name}
                          skill={skill}
                          isSelected={selectedSkills.includes(skill.name)}
                          onClick={() => toggleSkill(skill.name)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SkillPicker;
