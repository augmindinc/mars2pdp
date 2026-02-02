import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { Search, Plus, Trash2, ShoppingBag, BarChart3, TrendingDown, Target, Zap } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('insights');
  const [dbData, setDbData] = useState({ keywords: [], trackedProducts: [], history: {}, insights: {} });
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const fetchDashboard = async () => {
    const res = await fetch('http://localhost:3001/api/dashboard');
    const data = await res.json();
    setDbData(data);
  };

  useEffect(() => {
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 30000); // 30초마다 갱신
    return () => clearInterval(timer);
  }, []);

  const handleKeywordAction = async (keyword, action) => {
    setLoading(true);
    try {
      await fetch('http://localhost:3001/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, action })
      });
      fetchDashboard();
    } finally {
      setLoading(false);
    }
  };

  const getProductHistory = (id) => dbData.history[id] || [];

  return (
    <div className="app-container">
      <header className="dashboard-header">
        <div className="logo-section">
          <Zap className="accent-icon" fill="var(--primary)" size={28} />
          <h1>AI Market Bot</h1>
        </div>
        <div className="tabs">
          <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}>
            <BarChart3 size={18} /> Market Insights
          </button>
          <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
            <ShoppingBag size={18} /> Tracked Assets
          </button>
        </div>
      </header>

      {/* 🚀 Market Insights Tab (완전 자동 수집 결과 영역) */}
      {activeTab === 'insights' && (
        <section className="insight-view">
          <div className="discovery-config glass-card">
            <h3>🔍 모니터링 키워드 관리</h3>
            <p className="meta-label">서버가 이 키워드들을 매일 자동으로 검색하고 가격을 비교합니다.</p>
            <form className="keyword-form" onSubmit={(e) => { e.preventDefault(); handleKeywordAction(newKeyword, 'add'); setNewKeyword(''); }}>
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="예: 게이밍 마우스, 텐트, 캠핑 의자..."
              />
              <button type="submit" disabled={loading}><Plus size={18} /></button>
            </form>
            <div className="chip-container">
              {(dbData.keywords || []).map(k => (
                <span key={k} className="keyword-chip">
                  {k} <Trash2 size={14} onClick={() => handleKeywordAction(k, 'remove')} />
                </span>
              ))}
            </div>
            <button
              className="run-discovery-btn"
              onClick={async () => {
                setLoading(true);
                await fetch('http://localhost:3001/api/discovery', { method: 'POST' });
                alert('수집이 시작되었습니다. 1~2분 후 결과가 나타납니다.');
                setLoading(false);
              }}
              disabled={loading}
              style={{ marginTop: '20px', width: '100%', background: 'rgba(255,255,255,0.05)', color: 'white', padding: '12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', cursor: 'pointer' }}
            >
              {loading ? '수집 실행 중...' : '🔄 지금 즉시 시장조사 실행'}
            </button>
          </div>

          <div className="insights-grid">
            {Object.entries(dbData.insights || {}).map(([keyword, data]) => (
              <div key={keyword} className="glass-card insight-card">
                <div className="card-top">
                  <div>
                    <span className="badge">Market Alert</span>
                    <h2>{keyword}</h2>
                  </div>
                  <Target className="target-icon" size={24} />
                </div>

                <div className="summary-stats">
                  <div className="stat">
                    <p className="meta-label">최저가</p>
                    <p className="stat-value">{data.lowestPrice.toLocaleString()}원</p>
                  </div>
                  <div className="stat">
                    <p className="meta-label">분석 상품</p>
                    <p className="stat-value">{data.itemCount}개</p>
                  </div>
                </div>

                <div className="top-picks">
                  <p className="meta-label" style={{ marginBottom: '10px' }}>추천 상품 (Lowest Price First)</p>
                  {data.top3?.map((item, idx) => (
                    <div key={item.id} className="mini-product">
                      <img src={item.image} alt="" />
                      <div className="mini-info">
                        <p className="mini-title">{item.title.substring(0, 30)}...</p>
                        <p className="mini-price">{item.price.toLocaleString()}원
                          {idx === 0 && <span className="best-tag">BEST</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 📦 Tracked Products Tab (개별 상품 상세 분석 영역) */}
      {activeTab === 'products' && (
        <section className="products-view">
          <div className="product-list-pane">
            {(dbData.trackedProducts || []).map(p => (
              <div
                key={p.productId}
                className={`glass-card p-item ${selectedProductId === p.productId ? 'selected' : ''}`}
                onClick={() => setSelectedProductId(p.productId)}
              >
                <img src={p.image} alt="" />
                <div className="p-text">
                  <h4>{p.title.substring(0, 50)}...</h4>
                  <p className="p-meta">{p.keyword} | {p.productId}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="analysis-pane">
            {selectedProductId ? (
              <div className="glass-card full-analysis">
                <h3>가격 변동 분석</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={getProductHistory(selectedProductId)}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="date" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
                      <Area type="monotone" dataKey="price" stroke="var(--primary)" fill="url(#priceGradient)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <BarChart3 size={48} />
                <p>상품을 선택하여 가격 추이를 확인하세요.</p>
              </div>
            )}
          </div>
        </section>
      )}

      <style>{`
        .app-container { max-width: 1400px; margin: 0 auto; padding: 30px; }
        .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; }
        .logo-section { display: flex; align-items: center; gap: 12px; }
        .logo-section h1 { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px; }
        .badge { background: rgba(255, 71, 71, 0.2); color: var(--primary); padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; display: inline-block; }
        
        .insight-view { display: grid; grid-template-columns: 350px 1fr; gap: 30px; }
        .keyword-form { display: flex; gap: 10px; margin: 15px 0; }
        .keyword-form input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; color: white; }
        .keyword-form button { background: var(--primary); color: white; border: none; padding: 0 15px; border-radius: 10px; cursor: pointer; }
        .chip-container { display: flex; flex-wrap: wrap; gap: 10px; }
        .keyword-chip { background: rgba(255,255,255,0.08); padding: 6px 12px; border-radius: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.1); }
        .keyword-chip svg { cursor: pointer; color: #666; }
        .keyword-chip svg:hover { color: var(--primary); }

        .insights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
        .insight-card { padding: 25px; border-top: 4px solid var(--primary); }
        .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .target-icon { color: rgba(255,255,255,0.1); }
        .summary-stats { display: flex; gap: 30px; background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; margin-bottom: 20px; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: var(--primary); }

        .mini-product { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .mini-product img { width: 50px; height: 50px; border-radius: 8px; object-fit: cover; }
        .mini-info { flex: 1; }
        .mini-title { font-size: 0.85rem; color: #ccc; }
        .mini-price { font-size: 0.95rem; font-weight: 600; margin-top: 4px; display: flex; align-items: center; gap: 10px; }
        .best-tag { background: #FFD700; color: black; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 800; }

        .products-view { display: grid; grid-template-columns: 400px 1fr; gap: 30px; height: calc(100vh - 200px); }
        .product-list-pane { overflow-y: auto; display: flex; flex-direction: column; gap: 15px; padding-right: 10px; }
        .p-item { display: flex; gap: 15px; padding: 15px; cursor: pointer; transition: 0.2s; }
        .p-item img { width: 60px; height: 60px; border-radius: 8px; }
        .p-item.selected { border-color: var(--primary); background: rgba(255,71,71,0.05); }
        .p-text h4 { font-size: 0.9rem; line-height: 1.3; }
        .p-meta { font-size: 0.75rem; color: #666; margin-top: 5px; }

        .analysis-pane { position: sticky; top: 0; }
        .empty-state { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #333; gap: 20px; }
      `}</style>
    </div>
  );
}

export default App;
