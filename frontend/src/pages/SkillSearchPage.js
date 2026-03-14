import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import SkillPicker from '../components/SkillPicker';
import ReportModal from '../components/ReportModal';
import KebabMenu from '../components/KebabMenu';
import { AlertTriangle, Lightbulb, Target, Handshake, Star, Download, Upload, MessageCircle } from 'lucide-react';


function SkillSearchPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [skillsOffered, setSkillsOffered] = useState([]);
  const [skillsWanted, setSkillsWanted] = useState([]);
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportSuccess, setReportSuccess] = useState('');

  const onlineUsers = useAuthStore(state => state.onlineUsers);

  const handleFindMatches = async () => {
    if (skillsOffered.length === 0 && skillsWanted.length === 0) {
      setError('Select at least one skill to begin your journey');
      return;
    }

    setIsAnimating(true);
    setLoading(true);
    setError('');

    try {
      let allUsers = [];

      // Parallel search for better performance
      const searchPromises = [
        ...skillsWanted.map(skill =>
          api.get(`/users/search?keyword=${encodeURIComponent(skill)}`)
        ),
        ...skillsOffered.map(skill =>
          api.get(`/users/search?keyword=${encodeURIComponent(skill)}`)
        )
      ];

      const responses = await Promise.all(searchPromises);
      responses.forEach(({ data }) => allUsers.push(...data.users));

      // Deduplicate and score
      const uniqueUsers = allUsers.filter((user, index, self) =>
        index === self.findIndex(u => u._id === user._id)
      );

      const scoredUsers = uniqueUsers.map(user => {
        const theirOffered = user.skillsOffered || [];
        const theirWanted = user.skillsWanted || [];

        const canTeachMe = skillsWanted.filter(skill =>
          theirOffered.some(s => s.toLowerCase() === skill.toLowerCase())
        );

        const canTeachThem = skillsOffered.filter(skill =>
          theirWanted.some(s => s.toLowerCase() === skill.toLowerCase())
        );

        const score = canTeachMe.length + canTeachThem.length;
        const matchPercentage = Math.min(100, Math.round((score / Math.max(skillsOffered.length + skillsWanted.length, 1)) * 100));

        return {
          ...user,
          canTeachMe,
          canTeachThem,
          score,
          matchPercentage,
          isPerfectMatch: canTeachMe.length > 0 && canTeachThem.length > 0
        };
      });

      scoredUsers.sort((a, b) => b.score - a.score);

      setTimeout(() => {
        setMatchedUsers(scoredUsers);
        setStep(2);
        setIsAnimating(false);
      }, 800);

    } catch (err) {
      setError('Unable to find matches. Please try again.');
      setIsAnimating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setMatchedUsers([]);
    setError('');
  };

  const goToRequestsPage = (user) => {
    localStorage.setItem('swapRequestPrefill', JSON.stringify({
      toUser: user._id,
      toUserName: user.name,
      suggestedOffer: user.canTeachThem[0] || '',
      suggestedWant: user.canTeachMe[0] || ''
    }));
    navigate('/requests');
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const totalSelected = skillsOffered.length + skillsWanted.length;

  // Step 1: Skill Selection Interface
  if (step === 1) {
    return (
      <div className="skill-search-modern">
        {/* Animated Background */}
        <div className="ambient-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>

        {/* Header Section */}
        <div className="search-header">
          <div className="header-content">
            <h1 className="gradient-title">
              <span className="title-word">Discover</span>
              <span className="title-accent">Your</span>
              <span className="title-word">Perfect</span>
              <span className="title-accent">Match</span>
            </h1>
            <p className="header-subtitle">
              Share what you know, learn what you love.
              Connect with skilled individuals in your community.
            </p>
          </div>

          {/* Live Counter Badge */}
          <div className={`selection-counter ${totalSelected > 0 ? 'active' : ''}`}>
            <div className="counter-ring">
              <span className="counter-number">{totalSelected}</span>
              <span className="counter-label">selected</span>
            </div>
          </div>
        </div>

        {/* Main Selection Area */}
        <div className="selection-stage">
          {/* Skills You Can Teach - Left Side */}
          <div className={`skill-column teach-column ${skillsOffered.length > 0 ? 'has-selection' : ''}`}>
            <div className="column-header">
              <div className="header-icon teach-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                </svg>
              </div>
              <div className="header-text">
                <h2>I Can Teach</h2>
                <p>Select skills you're confident sharing</p>
              </div>
              <div className="selection-badge">
                <span className="badge-count">{skillsOffered.length}</span>
              </div>
            </div>

            <div className="picker-container">
              <SkillPicker
                selectedSkills={skillsOffered}
                onChange={setSkillsOffered}
                mode="offer"
              />
            </div>

            {/* Selected Skills Preview */}
            {skillsOffered.length > 0 && (
              <div className="selected-preview">
                <div className="preview-label">You'll teach:</div>
                <div className="skill-chips">
                  {skillsOffered.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="preview-chip teach-chip">{skill}</span>
                  ))}
                  {skillsOffered.length > 3 && (
                    <span className="preview-chip more-chip">+{skillsOffered.length - 3}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Central Exchange Visual */}
          <div className="exchange-center">
            <div className={`exchange-connector ${totalSelected > 0 ? 'active' : ''}`}>
              <div className="connector-line"></div>
              <div className="exchange-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="connector-line"></div>
            </div>
            <div className="exchange-text">Knowledge Exchange</div>
          </div>

          {/* Skills You Want to Learn - Right Side */}
          <div className={`skill-column learn-column ${skillsWanted.length > 0 ? 'has-selection' : ''}`}>
            <div className="column-header">
              <div className="header-icon learn-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="header-text">
                <h2>I Want to Learn</h2>
                <p>Discover what you want to master</p>
              </div>
              <div className="selection-badge">
                <span className="badge-count">{skillsWanted.length}</span>
              </div>
            </div>

            <div className="picker-container">
              <SkillPicker
                selectedSkills={skillsWanted}
                onChange={setSkillsWanted}
                mode="want"
              />
            </div>

            {/* Selected Skills Preview */}
            {skillsWanted.length > 0 && (
              <div className="selected-preview">
                <div className="preview-label">You'll learn:</div>
                <div className="skill-chips">
                  {skillsWanted.slice(0, 3).map((skill, idx) => (
                    <span key={idx} className="preview-chip learn-chip">{skill}</span>
                  ))}
                  {skillsWanted.length > 3 && (
                    <span className="preview-chip more-chip">+{skillsWanted.length - 3}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className={`action-bar ${totalSelected > 0 ? 'visible' : ''}`}>
          <div className="action-content">
            <div className="selection-summary">
              <div className="summary-item">
                <span className="summary-number teach-num">{skillsOffered.length}</span>
                <span className="summary-label">to teach</span>
              </div>
              <div className="summary-divider">+</div>
              <div className="summary-item">
                <span className="summary-number learn-num">{skillsWanted.length}</span>
                <span className="summary-label">to learn</span>
              </div>
              <div className="summary-equals">=</div>
              <div className="summary-total">
                <span className="total-possible">Finding matches...</span>
              </div>
            </div>

            <button
              className={`find-button ${loading ? 'loading' : ''} ${isAnimating ? 'animating' : ''}`}
              onClick={handleFindMatches}
              disabled={loading || totalSelected === 0}
            >
              <span className="button-bg"></span>
              <span className="button-content">
                {loading ? (
                  <>
                    <span className="spinner-ring"></span>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <svg className="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <span>Find My Matches</span>
                    {totalSelected > 0 && (
                      <span className="button-badge">{totalSelected}</span>
                    )}
                  </>
                )}
              </span>
              <div className="button-shine"></div>
            </button>
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="error-toast" onClick={() => setError('')}>
            <span className="error-icon" style={{ display: 'flex' }}><AlertTriangle size={20} /></span>
            <span>{error}</span>
          </div>
        )}

        {/* Tips Section */}
        <div className="tips-section">
          <div className="tip-card">
            <span className="tip-icon" style={{ display: 'flex' }}><Lightbulb size={24} color="#eab308" /></span>
            <span className="tip-text">Select 3-5 skills for best results</span>
          </div>
          <div className="tip-card">
            <span className="tip-icon" style={{ display: 'flex' }}><Target size={24} color="#ef4444" /></span>
            <span className="tip-text">Perfect matches teach you what you want</span>
          </div>
          <div className="tip-card">
            <span className="tip-icon" style={{ display: 'flex' }}><Handshake size={24} color="#3b82f6" /></span>
            <span className="tip-text">Both parties must have complementary skills</span>
          </div>
        </div>

        {/* CSS Styles */}
        <style>{`
          .skill-search-modern {
            min-height: 100vh;
            padding: 2rem;
            position: relative;
            overflow-x: hidden;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          }

          /* Ambient Background */
          .ambient-background {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 0;
            overflow: hidden;
          }

          .gradient-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(80px);
            opacity: 0.4;
            animation: float 20s infinite ease-in-out;
          }

          .orb-1 {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            top: -200px;
            left: -100px;
            animation-delay: 0s;
          }

          .orb-2 {
            width: 300px;
            height: 300px;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            bottom: -100px;
            right: -50px;
            animation-delay: -5s;
          }

          .orb-3 {
            width: 250px;
            height: 250px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            top: 50%;
            left: 50%;
            animation-delay: -10s;
          }

          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(50px, -50px) scale(1.1); }
            50% { transform: translate(-30px, 30px) scale(0.9); }
            75% { transform: translate(20px, 20px) scale(1.05); }
          }

          /* Header */
          .search-header {
            position: relative;
            z-index: 1;
            text-align: center;
            margin-bottom: 3rem;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 2rem;
          }

          .header-content {
            flex: 1;
            max-width: 600px;
          }

          .gradient-title {
            font-size: 3.5rem;
            font-weight: 800;
            margin: 0 0 1rem 0;
            line-height: 1.1;
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.5rem;
          }

          .title-word {
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .title-accent {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .header-subtitle {
            font-size: 1.25rem;
            color: #64748b;
            margin: 0;
            line-height: 1.6;
          }

          /* Selection Counter */
          .selection-counter {
            position: relative;
            width: 100px;
            height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          }

          .selection-counter.active {
            opacity: 1;
            transform: scale(1);
          }

          .counter-ring {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
            animation: pulse-ring 2s infinite;
          }

          @keyframes pulse-ring {
            0%, 100% { box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3); }
            50% { box-shadow: 0 10px 60px rgba(102, 126, 234, 0.5); }
          }

          .counter-number {
            font-size: 2.5rem;
            font-weight: 800;
            color: white;
            line-height: 1;
          }

          .counter-label {
            font-size: 0.75rem;
            color: rgba(255,255,255,0.9);
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          /* Selection Stage */
          .selection-stage {
            position: relative;
            z-index: 1;
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 2rem;
            max-width: 1400px;
            margin: 0 auto 2rem;
            align-items: start;
          }

          /* Skill Columns */
          .skill-column {
            background: white;
            border-radius: 24px;
            padding: 2rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
            border: 2px solid transparent;
          }

          .teach-column.has-selection {
            border-color: #10b981;
            box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.1), 0 10px 10px -5px rgba(16, 185, 129, 0.04);
          }

          .learn-column.has-selection {
            border-color: #8b5cf6;
            box-shadow: 0 20px 25px -5px rgba(139, 92, 246, 0.1), 0 10px 10px -5px rgba(139, 92, 246, 0.04);
          }

          .column-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1.5rem;
            border-bottom: 2px solid #f1f5f9;
          }

          .header-icon {
            width: 56px;
            height: 56px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .teach-icon {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            color: #059669;
          }

          .learn-icon {
            background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
            color: #7c3aed;
          }

          .header-icon svg {
            width: 28px;
            height: 28px;
          }

          .header-text {
            flex: 1;
          }

          .header-text h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1e293b;
            margin: 0 0 0.25rem 0;
          }

          .header-text p {
            font-size: 0.875rem;
            color: #64748b;
            margin: 0;
          }

          .selection-badge {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 0.875rem;
            color: #64748b;
            transition: all 0.3s ease;
          }

          .has-selection .selection-badge {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            transform: scale(1.1);
          }

          .picker-container {
            min-height: 400px;
          }

          /* Selected Preview */
          .selected-preview {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 2px dashed #e2e8f0;
          }

          .preview-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #94a3b8;
            margin-bottom: 0.75rem;
            font-weight: 600;
          }

          .skill-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }

          .preview-chip {
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 500;
            animation: chipIn 0.3s ease;
          }

          @keyframes chipIn {
            from {
              opacity: 0;
              transform: scale(0.8) translateY(-10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          .teach-chip {
            background: #d1fae5;
            color: #065f46;
          }

          .learn-chip {
            background: #ede9fe;
            color: #5b21b6;
          }

          .more-chip {
            background: #f1f5f9;
            color: #64748b;
          }

          /* Exchange Center */
          .exchange-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem 0;
          }

          .exchange-connector {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            opacity: 0.3;
            transition: all 0.5s ease;
          }

          .exchange-connector.active {
            opacity: 1;
          }

          .connector-line {
            width: 2px;
            height: 60px;
            background: linear-gradient(to bottom, #e2e8f0, #cbd5e1);
            border-radius: 1px;
            transition: all 0.5s ease;
          }

          .exchange-connector.active .connector-line {
            background: linear-gradient(to bottom, #667eea, #764ba2);
            height: 80px;
          }

          .exchange-icon {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: white;
            border: 2px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            transition: all 0.5s ease;
          }

          .exchange-connector.active .exchange-icon {
            border-color: #667eea;
            color: #667eea;
            transform: rotate(180deg);
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
          }

          .exchange-icon svg {
            width: 24px;
            height: 24px;
          }

          .exchange-text {
            margin-top: 1rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #94a3b8;
            font-weight: 600;
          }

          /* Action Bar */
          .action-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: white;
            border-top: 1px solid #e2e8f0;
            padding: 1.5rem 2rem;
            z-index: 100;
            transform: translateY(100%);
            transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.1);
          }

          .action-bar.visible {
            transform: translateY(0);
          }

          .action-content {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2rem;
          }

          .selection-summary {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .summary-item {
            text-align: center;
          }

          .summary-number {
            display: block;
            font-size: 2rem;
            font-weight: 800;
            line-height: 1;
          }

          .teach-num {
            color: #059669;
          }

          .learn-num {
            color: #7c3aed;
          }

          .summary-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .summary-divider, .summary-equals {
            font-size: 1.5rem;
            color: #cbd5e1;
            font-weight: 300;
          }

          .summary-total {
            padding-left: 1rem;
            border-left: 2px solid #e2e8f0;
          }

          .total-possible {
            font-size: 0.875rem;
            color: #64748b;
          }

          /* Find Button */
          .find-button {
            position: relative;
            padding: 1rem 2.5rem;
            border: none;
            border-radius: 16px;
            font-size: 1.125rem;
            font-weight: 700;
            color: white;
            cursor: pointer;
            overflow: hidden;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          }

          .find-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.4);
          }

          .find-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .find-button.loading {
            padding-left: 3.5rem;
          }

          .button-bg {
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            z-index: 0;
          }

          .button-content {
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .button-icon {
            width: 20px;
            height: 20px;
          }

          .button-badge {
            background: rgba(255,255,255,0.2);
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
          }

          .spinner-ring {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }

          .button-shine {
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
          }

          .find-button:hover .button-shine {
            left: 100%;
          }

          /* Error Toast */
          .error-toast {
            position: fixed;
            top: 2rem;
            left: 50%;
            transform: translateX(-50%);
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 1rem 2rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            cursor: pointer;
            animation: slideDown 0.3s ease;
            z-index: 200;
          }

          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
          }

          /* Tips Section */
          .tips-section {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: center;
            gap: 1.5rem;
            margin-top: 2rem;
            flex-wrap: wrap;
            padding-bottom: 120px;
          }

          .tip-card {
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            font-size: 0.875rem;
            color: #64748b;
            transition: all 0.3s ease;
          }

          .tip-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .tip-icon {
            font-size: 1.25rem;
          }

          /* Responsive */
          @media (max-width: 1024px) {
            .selection-stage {
              grid-template-columns: 1fr;
              gap: 1.5rem;
            }

            .exchange-center {
              display: none;
            }

            .gradient-title {
              font-size: 2.5rem;
            }

            .action-content {
              flex-direction: column;
              gap: 1rem;
            }

            .selection-summary {
              width: 100%;
              justify-content: center;
            }
          }

          @media (max-width: 640px) {
            .skill-search-modern {
              padding: 1rem;
            }

            .gradient-title {
              font-size: 2rem;
            }

            .skill-column {
              padding: 1.5rem;
            }

            .tips-section {
              flex-direction: column;
              align-items: center;
            }
          }
        `}</style>
      </div>
    );
  }

  // Step 2: Results View (Also redesigned)
  return (
    <div className="results-modern">
      {/* Results Header */}
      <div className="results-header">
        <button className="back-button" onClick={handleBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Back to Search</span>
        </button>

        <div className="results-title">
          <h1>
            {matchedUsers.length > 0 ? (
              <>
                Found <span className="highlight">{matchedUsers.length}</span> Skill Partner{matchedUsers.length !== 1 ? 's' : ''}
              </>
            ) : (
              'No Matches Found'
            )}
          </h1>
          <p>Based on your {skillsOffered.length} teachable and {skillsWanted.length} wanted skills</p>
        </div>
      </div>

      {/* Filter Tabs */}
      {matchedUsers.length > 0 && (
        <div className="filter-tabs">
          <button className="filter-tab active">
            All Matches
            <span className="tab-count">{matchedUsers.length}</span>
          </button>
          <button className="filter-tab">
            Perfect Matches
            <span className="tab-count perfect">
              {matchedUsers.filter(u => u.isPerfectMatch).length}
            </span>
          </button>
        </div>
      )}

      {/* Results Grid */}
      <div className="results-grid">
        {matchedUsers.length === 0 ? (
          <div className="empty-state-enhanced">
            <div className="empty-illustration">
              <svg viewBox="0 0 200 200" className="search-illustration">
                <circle cx="100" cy="100" r="80" fill="#f1f5f9" />
                <circle cx="100" cy="100" r="60" fill="#e2e8f0" />
                <path d="M100 60 L100 100 L130 130" stroke="#94a3b8" strokeWidth="4" fill="none" strokeLinecap="round" />
                <circle cx="100" cy="100" r="8" fill="#64748b" />
              </svg>
            </div>
            <h3>No matches yet</h3>
            <p>Try selecting different skills or add more variety to your profile</p>
            <button className="retry-button" onClick={handleBack}>
              Adjust My Skills
            </button>
          </div>
        ) : (
          matchedUsers.map((user, index) => (
            <div
              key={user._id}
              className={`match-card-enhanced ${user.isPerfectMatch ? 'perfect' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Match Score Badge */}
              <div className="match-score-badge">
                <div className="score-ring">
                  <svg viewBox="0 0 36 36" className="score-svg">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={user.isPerfectMatch ? '#10b981' : '#667eea'}
                      strokeWidth="3"
                      strokeDasharray={`${user.matchPercentage}, 100`}
                      className="score-progress"
                    />
                  </svg>
                  <div className="score-text">
                    <span className="score-percent">{user.matchPercentage}%</span>
                  </div>
                </div>
              </div>

              {/* Report Menu (Top Left or Right depending on preference, left for now) */}
              <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 10 }}>
                <KebabMenu
                  actions={[
                    {
                      label: 'Report User',
                      icon: '⚠️',
                      destructive: true,
                      onClick: () => setShowReportModal(user)
                    }
                  ]}
                />
              </div>

              {/* Perfect Match Ribbon */}
              {user.isPerfectMatch && (
                <div className="perfect-ribbon">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Star size={14} color="#eab308" fill="currentColor" /> Perfect Match</span>
                </div>
              )}

              {/* User Header */}
              <div className="user-header" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: 0 }}>
                  <div className="avatar-container">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.name} className="user-avatar" />
                    ) : (
                      <div className="avatar-placeholder" style={{ background: `linear-gradient(135deg, ${stringToColor(user.name)} 0%, ${stringToColor(user.name + '1')} 100%)` }}>
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div className={`status-dot ${onlineUsers.includes(String(user._id)) ? 'online' : 'offline'}`}></div>
                  </div>

                  <div className="user-info">
                    <h3 className="user-name">{user.name}</h3>
                    <p className="user-email">{user.email}</p>
                    <div className="match-tags">
                      {user.isPerfectMatch && (
                        <span className="tag perfect-tag">Mutual Exchange</span>
                      )}
                      {user.canTeachMe.length > 0 && (
                        <span className="tag teach-tag">Can Teach You</span>
                      )}
                      {user.canTeachThem.length > 0 && (
                        <span className="tag learn-tag">Wants to Learn</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills Exchange Visualization */}
              <div className="exchange-visual">
                {/* What they can teach me */}
                {user.canTeachMe.length > 0 && (
                  <div className="exchange-row incoming">
                    <div className="exchange-direction">
                      <span className="direction-icon" style={{ display: 'flex' }}><Download size={14} /></span>
                      <span className="direction-label">They'll teach you</span>
                    </div>
                    <div className="exchange-skills">
                      {user.canTeachMe.map((skill, i) => (
                        <span key={i} className="exchange-skill incoming-skill">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* What I can teach them */}
                {user.canTeachThem.length > 0 && (
                  <div className="exchange-row outgoing">
                    <div className="exchange-direction">
                      <span className="direction-icon" style={{ display: 'flex' }}><Upload size={14} /></span>
                      <span className="direction-label">You can teach</span>
                    </div>
                    <div className="exchange-skills">
                      {user.canTeachThem.map((skill, i) => (
                        <span key={i} className="exchange-skill outgoing-skill">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                className={`connect-button ${user.isPerfectMatch ? 'perfect' : ''}`}
                onClick={() => goToRequestsPage(user)}
              >
                <span className="button-text" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {user.isPerfectMatch ? (
                    <><Handshake size={18} /> Start Exchange</>
                  ) : (
                    <><MessageCircle size={18} /> Send Request</>
                  )}
                </span>
                <svg className="button-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {showReportModal && (
        <ReportModal
          reportedUser={showReportModal}
          onClose={() => setShowReportModal(null)}
          onSuccess={() => {
            setShowReportModal(null);
            setReportSuccess('User reported successfully.');
            setTimeout(() => setReportSuccess(''), 3000);
          }}
        />
      )}

      {reportSuccess && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          zIndex: 9999,
          fontWeight: 600,
          animation: 'slideUp 0.3s ease'
        }}>
          {reportSuccess}
        </div>
      )}

      {/* Results CSS */}
      <style>{`
        .results-modern {
          min-height: 100vh;
          padding: 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }

        .results-header {
          max-width: 1200px;
          margin: 0 auto 2rem;
        }

        .back-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #64748b;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }

        .back-button:hover {
          border-color: #667eea;
          color: #667eea;
          transform: translateX(-4px);
        }

        .back-button svg {
          width: 20px;
          height: 20px;
        }

        .results-title h1 {
          font-size: 2.5rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .results-title .highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .results-title p {
          color: #64748b;
          font-size: 1.125rem;
          margin: 0;
        }

        .filter-tabs {
          max-width: 1200px;
          margin: 0 auto 2rem;
          display: flex;
          gap: 1rem;
        }

        .filter-tab {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .filter-tab.active {
          border-color: #667eea;
          color: #667eea;
          background: #eff6ff;
        }

        .tab-count {
          background: #f1f5f9;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
        }

        .tab-count.perfect {
          background: #d1fae5;
          color: #065f46;
        }

        .results-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .match-card-enhanced {
          background: white;
          border-radius: 24px;
          padding: 2rem;
          position: relative;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
          animation: cardIn 0.5s ease backwards;
          border: 2px solid transparent;
        }

        @keyframes cardIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .match-card-enhanced:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .match-card-enhanced.perfect {
          border-color: #10b981;
          background: linear-gradient(135deg, white 0%, #f0fdf4 100%);
        }

        .match-score-badge {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
        }

        .score-ring {
          position: relative;
          width: 60px;
          height: 60px;
        }

        .score-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .score-progress {
          stroke-linecap: round;
          transition: stroke-dasharray 0.5s ease;
        }

        .score-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .score-percent {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
        }

        .perfect-ribbon {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%) translateY(-50%);
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 0.5rem 1.5rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          white-space: nowrap;
        }

        .user-header {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .avatar-container {
          position: relative;
          flex-shrink: 0;
        }

        .user-avatar, .avatar-placeholder {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.5rem;
        }

        .status-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .status-dot.online {
          background: #10b981;
        }

        .status-dot.offline {
          background: #94a3b8;
        }

        .user-info {
          flex: 1;
          min-width: 0;
        }

        .user-name {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.25rem 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-email {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0 0 0.75rem 0;
        }

        .match-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .perfect-tag {
          background: #d1fae5;
          color: #065f46;
        }

        .teach-tag {
          background: #ede9fe;
          color: #5b21b6;
        }

        .learn-tag {
          background: #dbeafe;
          color: #1e40af;
        }

        .exchange-visual {
          background: #f8fafc;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .exchange-row {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .exchange-row.incoming {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px dashed #e2e8f0;
        }

        .exchange-direction {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 600;
        }

        .direction-icon {
          font-size: 1rem;
        }

        .exchange-skills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .exchange-skill {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .incoming-skill {
          background: #ede9fe;
          color: #5b21b6;
        }

        .outgoing-skill {
          background: #d1fae5;
          color: #065f46;
        }

        .connect-button {
          width: 100%;
          padding: 1rem;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .connect-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }

        .connect-button.perfect {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .connect-button.perfect:hover {
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .button-arrow {
          width: 20px;
          height: 20px;
          transition: transform 0.3s ease;
        }

        .connect-button:hover .button-arrow {
          transform: translateX(4px);
        }

        /* Empty State */
        .empty-state-enhanced {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
        }

        .empty-illustration {
          width: 200px;
          height: 200px;
          margin: 0 auto 2rem;
        }

        .search-illustration {
          width: 100%;
          height: 100%;
          animation: float 6s ease-in-out infinite;
        }

        .empty-state-enhanced h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0 0 0.5rem 0;
        }

        .empty-state-enhanced p {
          color: #64748b;
          margin: 0 0 1.5rem 0;
        }

        .retry-button {
          padding: 0.875rem 2rem;
          background: white;
          border: 2px solid #667eea;
          color: #667eea;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .retry-button:hover {
          background: #667eea;
          color: white;
        }

        @media (max-width: 768px) {
          .results-grid {
            grid-template-columns: 1fr;
          }

          .results-title h1 {
            font-size: 1.75rem;
          }

          .match-card-enhanced {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

// Helper function for consistent colors
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export default SkillSearchPage;
