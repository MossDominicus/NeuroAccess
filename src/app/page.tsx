export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg text-gray-900">NeuroAccess</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#about" className="hover:text-blue-600 transition-colors">关于项目</a>
            <a href="#tech" className="hover:text-blue-600 transition-colors">技术原理</a>
            <a href="#data" className="hover:text-blue-600 transition-colors">数据公开</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">联系我们</a>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero 区域 */}
      <section className="pt-32 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
            🧠 AI 数字无障碍 · 公益开源项目
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            用脑电与行为数据
            <br />
            <span className="text-blue-600">让每个人都能无障碍就医</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            NeuroAccess 基于 EEG 脑电信号与行为数据融合分析，
            评估医院挂号系统的可访问性，为无障碍设计提供科学依据。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#about"
              className="bg-blue-600 text-white px-8 py-3 rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors"
            >
              了解项目 →
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-gray-300 text-gray-700 px-8 py-3 rounded-xl text-base font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors"
            >
              ⭐ 在 GitHub 上查看
            </a>
          </div>
        </div>
      </section>

      {/* 数据统计 */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "3", unit: "种", label: "评估模型" },
            { num: "100+", unit: "", label: "脑电通道" },
            { num: "5", unit: "步", label: "挂号流程步骤" },
            { num: "100%", unit: "", label: "开源免费" },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-4xl font-bold text-blue-600">
                {item.num}<span className="text-2xl text-blue-400">{item.unit}</span>
              </div>
              <div className="text-gray-500 mt-2">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 关于项目 */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">关于 NeuroAccess</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              一个基于神经科学与行为分析的医疗无障碍评估系统
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🧠",
                title: "EEG 脑电信号",
                desc: "通过脑电设备采集用户操作时的认知负荷信号，量化每一步的心理负担。",
              },
              {
                icon: "🖱️",
                title: "行为数据分析",
                desc: "记录点击、停顿、错误操作等行为数据，识别交互摩擦点。",
              },
              {
                icon: "📊",
                title: "融合评估模型",
                desc: "将脑电与行为数据融合，生成每步骤可访问性可靠性评分。",
              },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
                <p className="text-gray-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 技术原理 */}
      <section id="tech" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">三组对比模型</h2>
            <p className="text-lg text-gray-600">科学验证，可信可靠</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "仅行为模型",
                color: "orange",
                items: ["点击流分析", "停顿时间检测", "错误率统计", "操作路径追踪"],
              },
              {
                title: "仅 EEG 模型",
                color: "purple",
                items: ["认知负荷评估", "注意力检测", "情绪压力分析", "脑力疲劳监测"],
              },
              {
                title: "融合模型（核心）",
                color: "blue",
                items: ["行为+EEG 特征融合", "每步骤可靠性评分", "个体差异校准", "可访问性综合指数"],
              },
            ].map((model, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100">
                <div className={`w-12 h-12 bg-${model.color}-100 rounded-xl flex items-center justify-center mb-6`}>
                  <span className={`text-${model.color}-600 font-bold text-lg`}>{i + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{model.title}</h3>
                <ul className="space-y-3">
                  {model.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-3 text-gray-600">
                      <span className={`w-2 h-2 bg-${model.color}-400 rounded-full flex-shrink-0`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 开源数据 */}
      <section id="data" className="py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">数据公开 · 开源共建</h2>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            所有评估数据、分析代码均开源，欢迎研究者与开发者共同参与。
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { title: "behavior.csv", desc: "行为任务数据（点击、停顿、错误记录）" },
              { title: "markers.csv", desc: "EEG 事件标记（每步骤时间戳）" },
              { title: "fuse_user_data.py", desc: "行为+EEG 数据融合脚本" },
              { title: "generate_accessibility_report.py", desc: "可访问性评分报告生成器" },
            ].map((file, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-6 text-left border border-gray-100">
                <div className="font-mono text-sm text-blue-600 font-semibold mb-2">{file.title}</div>
                <div className="text-gray-600 text-sm">{file.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-lg text-white">NeuroAccess</span>
          </div>
          <p className="text-sm mb-6">AI 数字无障碍公益项目 · 让科技有温度</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="https://github.com" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">研究论文</a>
            <a href="#" className="hover:text-white transition-colors">联系作者</a>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-xs">
            © 2026 NeuroAccess · 开源 MIT 协议 · 仅供研究使用
          </div>
        </div>
      </footer>
    </div>
  );
}
