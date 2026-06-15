import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { usePageMeta } from '../shared/hooks/usePageMeta'

const sizeRows = [
  {
    size: 'S',
    height: '160 - 168 cm',
    weight: '50 - 58 kg',
    chest: '88 - 94 cm',
    shoulder: '40 - 42 cm',
    note: 'Dáng gọn, hợp người mảnh.',
    minWeight: 50,
    maxWeight: 58,
  },
  {
    size: 'M',
    height: '166 - 173 cm',
    weight: '58 - 66 kg',
    chest: '94 - 100 cm',
    shoulder: '42 - 44 cm',
    note: 'Dễ mặc nhất, vừa người.',
    minWeight: 58,
    maxWeight: 66,
  },
  {
    size: 'L',
    height: '170 - 178 cm',
    weight: '66 - 74 kg',
    chest: '100 - 106 cm',
    shoulder: '44 - 46 cm',
    note: 'Thoải mái hơn ở vai và ngực.',
    minWeight: 66,
    maxWeight: 74,
  },
  {
    size: 'XL',
    height: '175 - 183 cm',
    weight: '74 - 84 kg',
    chest: '106 - 114 cm',
    shoulder: '46 - 48 cm',
    note: 'Rộng rãi, hợp người vai lớn.',
    minWeight: 74,
    maxWeight: 84,
  },
]

const fitModes = [
  { value: 'fit', label: 'Ôm gọn', offset: -1 },
  { value: 'regular', label: 'Vừa người', offset: 0 },
  { value: 'relaxed', label: 'Rộng thoải mái', offset: 1 },
]

function clampIndex(index) {
  return Math.max(0, Math.min(sizeRows.length - 1, index))
}

function getBaseSizeIndex(weight) {
  const numericWeight = Number(weight)

  if (!numericWeight) return 1
  if (numericWeight < 58) return 0
  if (numericWeight < 66) return 1
  if (numericWeight < 74) return 2
  return 3
}

function SizeGuide() {
  const [height, setHeight] = useState('170')
  const [weight, setWeight] = useState('65')
  const [fitMode, setFitMode] = useState('regular')

  usePageMeta({
    title: 'Huong dan chon size | PoloMan',
    description: 'Bang size S M L XL va cong cu goi y size ao PoloMan theo chieu cao, can nang.',
    canonicalPath: '/size-guide',
  })

  const recommendation = useMemo(() => {
    const mode = fitModes.find((item) => item.value === fitMode) || fitModes[1]
    const baseIndex = getBaseSizeIndex(weight)
    const size = sizeRows[clampIndex(baseIndex + mode.offset)]
    const numericHeight = Number(height)
    const heightHint =
      numericHeight >= 178 && size.size !== 'XL'
        ? 'Bạn khá cao, nếu thích tay áo và thân áo dài hơn hãy tăng thêm 1 size.'
        : numericHeight <= 163 && size.size !== 'S'
          ? 'Bạn thấp hơn trung bình, nếu không thích form dài hãy cân nhắc giảm 1 size.'
          : 'Size này là điểm bắt đầu hợp lý cho dáng polo nam thường ngày.'

    return { ...size, heightHint }
  }, [fitMode, height, weight])

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-[linear-gradient(135deg,#f6fbf1_0%,#ffffff_54%,#ecf8ef_100%)] shadow-sm">
        <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.6fr)] lg:p-10">
          <div className="flex flex-col justify-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700/70">
              PoloMan size finder
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-black leading-tight text-emerald-950 sm:text-5xl">
              Chọn size polo nhanh hơn, mặc lên gọn hơn.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-emerald-900/65">
              Nhập chiều cao, cân nặng và kiểu mặc mong muốn. Bảng này áp dụng cho các size S, M, L, XL của PoloMan.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white/88 p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800/60">
                  Chiều cao
                </span>
                <input
                  type="number"
                  min="145"
                  max="200"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                  className="h-12 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 text-lg font-black text-emerald-950 outline-none focus:border-emerald-600"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800/60">
                  Cân nặng
                </span>
                <input
                  type="number"
                  min="40"
                  max="110"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  className="h-12 rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 text-lg font-black text-emerald-950 outline-none focus:border-emerald-600"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {fitModes.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setFitMode(mode.value)}
                  className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
                    fitMode === mode.value
                      ? 'border-emerald-800 bg-emerald-800 text-white'
                      : 'border-emerald-100 bg-white text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-emerald-950 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/70">
                Size gợi ý
              </p>
              <div className="mt-3 flex items-end gap-4">
                <span className="text-6xl font-black leading-none">{recommendation.size}</span>
                <div className="pb-1 text-sm text-white/70">
                  <p>{recommendation.weight}</p>
                  <p>{recommendation.height}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/72">{recommendation.heightHint}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
          <div className="border-b border-emerald-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-black text-emerald-950">Bảng size S - M - L - XL</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-emerald-50 text-xs font-black uppercase tracking-[0.14em] text-emerald-800/65">
                <tr>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-5 py-4">Chiều cao</th>
                  <th className="px-5 py-4">Cân nặng</th>
                  <th className="px-5 py-4">Vòng ngực</th>
                  <th className="px-5 py-4">Rộng vai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {sizeRows.map((row) => (
                  <tr
                    key={row.size}
                    className={recommendation.size === row.size ? 'bg-emerald-50/70' : 'bg-white'}
                  >
                    <td className="px-6 py-5">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-900 text-lg font-black text-white">
                        {row.size}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-sm font-semibold text-emerald-950">{row.height}</td>
                    <td className="px-5 py-5 text-sm font-semibold text-emerald-950">{row.weight}</td>
                    <td className="px-5 py-5 text-sm text-emerald-900/70">{row.chest}</td>
                    <td className="px-5 py-5 text-sm text-emerald-900/70">{row.shoulder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-950">
            Mẹo chọn size
          </h2>
          <div className="space-y-3 text-sm leading-6 text-emerald-900/72">
            <p>Đang nằm giữa 2 size: chọn size nhỏ hơn nếu thích gọn, chọn size lớn hơn nếu thích thoải mái.</p>
            <p>Vai rộng, ngực dày hoặc bụng lớn nên tăng 1 size so với gợi ý cân nặng.</p>
            <p>Polo cotton có thể co nhẹ sau giặt, tránh chọn size quá sát người.</p>
          </div>
          <Link
            to="/products"
            className="mt-3 flex h-12 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-black uppercase tracking-[0.12em] text-white hover:bg-emerald-900"
          >
            Quay lại mua hàng
          </Link>
        </aside>
      </section>
    </div>
  )
}

export default SizeGuide
