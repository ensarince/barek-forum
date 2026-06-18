import { createClient } from '@/lib/supabase/server'
import type { Page } from '@/types/database'

const SUPABASE_CONFIGURED =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url'

const PLACEHOLDER_RULES = `## Barek Kaya Tırmanış Alanı Kuralları

### Genel Davranış
- Alanda diğer tırmanıcılara saygılı ol.
- Gürültüyü minimumda tut, özellikle erken sabah ve akşam saatlerinde.
- Hayvanlar ve bitki örtüsüne zarar verme.

### Güvenlik
- Tek başına tırmanma. Acil durumlar için her zaman yanında biri olsun.
- Mat kullanımı zorunludur; yeterli mat olmadan bölüm atlamaya çalışma.
- Islak ya da buzlu kayalara tırmanma.

### Alan Bakımı
- Kaya yüzeylerini fırçala ama aşırıya kaçma.
- Çöpünü yanında getir, yanında götür.
- Ateş yakmak yasaktır.
- Kamp alanları dışında geceleme yapma.

### Fotoğraf ve Sosyal Medya
- Yeni güzergahları sosyal medyada paylaşmadan önce yerel topluluğa sor.
- Beta videoları veya fotoğraflarını forumda paylaşmaktan çekinme.

### Sorumluluk Reddi
Tırmanma doğası gereği riskli bir aktivitedir. Her tırmanıcı kendi güvenliğinden sorumludur.`

export default async function RulesPage() {
  if (!SUPABASE_CONFIGURED) {
    return <RulesView title="Barek Bouldering Kuralları" content={PLACEHOLDER_RULES} />
  }

  const supabase = await createClient()
  const { data } = await supabase.from('pages').select('*').eq('slug', 'rules').single()
  const page = data as Page | null

  return (
    <RulesView
      title={page?.title ?? 'Kurallar'}
      content={page?.content ?? PLACEHOLDER_RULES}
    />
  )
}

function RulesView({ title, content }: { title: string; content: string }) {
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h1 className="text-xs uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">{title}</h1>
      <div className="bg-[#161616] border border-[#2a2a2a] p-6">
        <RulesContent content={content} />
      </div>
    </div>
  )
}

function RulesContent({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-2 text-sm text-[#e8e8e8] leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-base font-bold text-white uppercase tracking-wider mt-6 mb-2 first:mt-0">{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-sm font-semibold text-[#c0392b] uppercase tracking-wider mt-4 mb-1">{line.slice(4)}</h3>
        }
        if (line.startsWith('- ')) {
          return <p key={i} className="flex gap-2 text-[#c8c8c8]"><span className="text-[#8b1a1a] shrink-0">—</span><span>{line.slice(2)}</span></p>
        }
        if (line.trim() === '') {
          return <div key={i} className="h-1" />
        }
        return <p key={i} className="text-[#c8c8c8]">{line}</p>
      })}
    </div>
  )
}
