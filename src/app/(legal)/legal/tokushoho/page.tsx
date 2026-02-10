import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | GamiFi Members',
}

export default function TokushohoPage() {
  return (
    <article className="prose prose-gray max-w-none">
      <h1>特定商取引法に基づく表記</h1>
      <p className="text-sm text-gray-500">最終更新日: 2026年2月9日</p>

      <table>
        <tbody>
          <tr>
            <th className="w-1/3 bg-gray-50 text-left align-top">販売業者</th>
            <td>【運用開始前に記載】</td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">代表者</th>
            <td>【運用開始前に記載】</td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">所在地</th>
            <td>【運用開始前に記載】</td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">連絡先</th>
            <td>
              メール: 【運用開始前に記載】<br />
              電話: 【運用開始前に記載】<br />
              ※ 電話でのお問い合わせ受付時間: 平日10:00〜17:00
            </td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">販売価格</th>
            <td>各商品ページに記載のマイル数にて表示</td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">商品代金以外の必要料金</th>
            <td>
              <ul>
                <li>マイルの獲得・利用に追加料金はかかりません</li>
                <li>物理商品の送料は原則無料（一部離島を除く）</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">支払方法</th>
            <td>本サービス内のマイルによる交換（現金決済は行いません）</td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">支払時期</th>
            <td>交換申請時にマイルが即時消費されます</td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">商品の引渡し時期</th>
            <td>
              <ul>
                <li><strong>デジタル商品</strong>: 交換承認後、即時提供</li>
                <li><strong>物理商品</strong>: 交換承認後、通常5〜10営業日以内に発送</li>
                <li><strong>クーポン</strong>: 交換承認後、即時発行</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">返品・交換について</th>
            <td>
              <ul>
                <li><strong>デジタル商品</strong>: 性質上、返品・交換はお受けできません</li>
                <li><strong>物理商品</strong>: 商品到着後7日以内かつ未開封・未使用の場合に限り、返品・交換を承ります</li>
                <li><strong>不良品の場合</strong>: 商品到着後14日以内にご連絡いただければ、交換またはマイルの返還にて対応いたします</li>
                <li><strong>クーポン</strong>: 使用前に限り、マイルの返還にて対応いたします</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">返品送料</th>
            <td>
              <ul>
                <li>不良品・誤配送の場合: 当社負担</li>
                <li>お客様都合の場合: お客様負担</li>
              </ul>
            </td>
          </tr>
          <tr>
            <th className="bg-gray-50 text-left align-top">マイルの有効期限</th>
            <td>
              獲得日から<strong>12ヶ月間</strong><br />
              有効期限を過ぎたマイルは自動的に失効し、復元はできません。
              有効期限はマイル履歴画面にてご確認いただけます。
            </td>
          </tr>
        </tbody>
      </table>

      <h2>マイルに関する注意事項</h2>
      <ul>
        <li>マイルは本サービス内でのみご利用いただけます。</li>
        <li>マイルを現金に換金することはできません。</li>
        <li>マイルの第三者への譲渡・売買は禁止されています。</li>
        <li>不正な手段により獲得されたマイルは没収される場合があります。</li>
        <li>本サービス終了時は、少なくとも90日前に通知し、マイルの消化期間を設けます。</li>
      </ul>
    </article>
  )
}
