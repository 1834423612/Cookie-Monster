import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-10">
        <section className="rounded-3xl border border-border bg-card p-6 md:p-10">
          <p className="inline-flex rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">Cookie Monster · One Page</p>
          <h1 className="text-3xl md:text-5xl font-semibold mt-4 leading-tight">像草图一样的单页 Cookie 管理体验</h1>
          <p className="text-muted-foreground mt-4 max-w-3xl">
            左边饼干罐，右边怪兽卡片。点击罐子展开所有站点 cookie 分组列表；按域名展开查看详细内容、标签与删除建议；支持筛选和多选。
            重要 cookie 会被标注为保护项，避免误删。
          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <article className="rounded-2xl border border-border bg-muted/50 p-4">
              <h3 className="font-medium">1) 点击罐子</h3>
              <p className="text-sm text-muted-foreground mt-2">触发本地扫描并在右侧加载分组列表。</p>
            </article>
            <article className="rounded-2xl border border-border bg-muted/50 p-4">
              <h3 className="font-medium">2) 展开域名下拉</h3>
              <p className="text-sm text-muted-foreground mt-2">查看 cookie 细节、风险等级、关键标签。</p>
            </article>
            <article className="rounded-2xl border border-border bg-muted/50 p-4">
              <h3 className="font-medium">3) 自动推荐 + 多选删除</h3>
              <p className="text-sm text-muted-foreground mt-2">本地推荐可删项，允许你手动排除不想删的项。</p>
            </article>
          </div>

          <div className="rounded-2xl border border-chart-3/30 bg-chart-3/10 p-4 mt-8 text-sm">
            <strong>隐私优先：</strong>原始 cookie 内容始终只在本地扩展处理，网站端只消费摘要数据，不会上传 cookie 值。
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-medium">进入单页工作台</Link>
            <Link href="/docs" className="rounded-xl bg-muted px-5 py-3 text-sm font-medium">查看安装与隐私说明</Link>
          </div>
        </section>
      </main>
    </div>
  );
}
