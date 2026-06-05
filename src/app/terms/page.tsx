"use client";

import { useLang } from "@/lib/language-context";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { termsSections } from "@/lib/legal-content";

export default function TermsOfService() {
  const { t, lang } = useLang();

  const sections = {
    zh: [
      { title: "服务描述", content: "NeuroAccess 是一个 EEG（脑电图）数据教育分析平台。我们提供工具帮助您理解和分析 EEG 数据，但我们的服务不构成医疗建议、诊断或治疗。" },
      { title: "用户责任", content: "您负责您上传到我们平台的数据。请确保您有权分享这些数据，并且数据不包含敏感或受保护的健康信息（PHI）。我们不对您上传的数据的合法性负责。" },
      { title: "禁止用途", content: "您不得使用我们的服务进行任何非法活动，包括但不限于：上传恶意软件、侵犯他人隐私、进行未经授权的医疗诊断，或违反任何适用的法律法规。" },
      { title: "知识产权", content: "NeuroAccess 平台的所有内容、设计和代码均受版权和知识产权保护。未经明确书面许可，您不得复制、修改、分发或创建衍生作品。" },
      { title: "免责声明", content: "本服务按原样提供，不提供任何明示或暗示的保证。我们不保证服务的准确性、可靠性或适用性。EEG 分析结果仅供教育目的，不应作为医疗决策的依据。" },
      { title: "责任限制", content: "在任何情况下，NeuroAccess 及其开发者均不对因使用或无法使用本服务而导致的任何间接、附带、特殊、后果性或惩罚性损害承担责任。" },
      { title: "服务变更", content: "我们保留随时修改、暂停或终止本服务的权利，无需事先通知。我们也可能更新这些条款，变更将在本页面发布时生效。" },
      { title: "联系我们", content: "如果您对本服务条款有任何疑问，请通过网站反馈功能联系我们。" },
    ],
    en: [
      { title: "Service Description", content: "NeuroAccess is an EEG (electroencephalogram) data educational analysis platform. We provide tools to help you understand and analyze EEG data, but our service does not constitute medical advice, diagnosis, or treatment." },
      { title: "User Responsibilities", content: "You are responsible for the data you upload to our platform. Please ensure you have the right to share this data and that it does not contain sensitive or protected health information (PHI). We are not responsible for the legality of the data you upload." },
      { title: "Prohibited Uses", content: "You may not use our service for any illegal activities, including but not limited to: uploading malware, violating others' privacy, conducting unauthorized medical diagnoses, or violating any applicable laws and regulations." },
      { title: "Intellectual Property", content: "All content, design, and code of the NeuroAccess platform are protected by copyright and intellectual property laws. Without express written permission, you may not copy, modify, distribute, or create derivative works." },
      { title: "Disclaimer", content: "This service is provided &quot;as is&quot; without any express or implied warranty. We do not guarantee the accuracy, reliability, or suitability of the service. EEG analysis results are for educational purposes only and should not be used as a basis for medical decisions." },
      { title: "Limitation of Liability", content: "In no event shall NeuroAccess and its developers be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to the use or inability to use this service." },
      { title: "Service Changes", content: "We reserve the right to modify, suspend, or terminate this service at any time without prior notice. We may also update these terms, and changes will take effect when posted on this page." },
      { title: "Contact Us", content: "If you have any questions about these terms of service, please contact us through the website feedback feature." },
    ],
    ja: [
      { title: "サービス説明", content: "NeuroAccessはEEG（脳波）データの教育分析プラットフォームです。EEGデータの理解と分析を支援するツールを提供しますが、当社のサービスは医療アドバイス、診断、または治療を構成するものではありません。" },
      { title: "ユーザー責任", content: "プラットフォームにアップロードするデータの責任はユーザーにあります。データを共有する権利があり、機密情報や保護された健康情報（PHI）が含まれていないことを確認してください。アップロードしたデータの合法性について当社は責任を負いません。" },
      { title: "禁止事項", content: "当サービスを以下を含む違法活動に使用することはできません：マルウェアのアップロード、他者のプライバシー侵害、未承認の医療診断、または適用される法律や規制の違反。" },
      { title: "知的財産", content: "NeuroAccessプラットフォームのすべてのコンテンツ、デザイン、コードは著作権および知的財産権により保護されています。明示的な書面による許可なしに、複製、改変、配布、または派生物の作成を行うことはできません。" },
      { title: "免責事項", content: "本サービスは現状のまま提供され、明示的または黙示的な保証はありません。サービスの正確性、信頼性、または適合性を保証しません。EEG分析結果は教育目的のみであり、医療意思決定の根拠として使用すべきではありません。" },
      { title: "責任制限", content: "いかなる場合も、NeuroAccessおよびその開発者は、本サービスの使用または使用不能に起因する間接的、付随的、特別、結果的、または懲罰的損害について責任を負いません。" },
      { title: "サービス変更", content: "事前通知なしに、いつでも本サービスを変更、停止、または終了する権利を留保します。これらの条項も更新する場合があり、変更は本ページに掲載された時点で有効となります。" },
      { title: "お問い合わせ", content: "本サービス条項についてご質問がある場合は、ウェブサイトのフィードバック機能を通じてお問い合わせください。" },
    ],
    es: [
      { title: "Descripción del Servicio", content: "NeuroAccess es una plataforma de análisis educativo de datos EEG (electroencefalograma). Proporcionamos herramientas para ayudarle a comprender y analizar datos EEG, pero nuestro servicio no constituye asesoramiento médico, diagnóstico o tratamiento." },
      { title: "Responsabilidades del Usuario", content: "Usted es responsable de los datos que carga en nuestra plataforma. Asegúrese de tener el derecho de compartir estos datos y que no contengan información de salud sensible o protegida (PHI). No somos responsables de la legalidad de los datos que carga." },
      { title: "Usos Prohibidos", content: "No puede utilizar nuestro servicio para actividades ilegales, incluyendo pero no limitado a: cargar malware, violar la privacidad de otros, realizar diagnósticos médicos no autorizados, o violar cualquier ley o regulación aplicable." },
      { title: "Propiedad Intelectual", content: "Todo el contenido, diseño y código de la plataforma NeuroAccess están protegidos por derechos de autor y leyes de propiedad intelectual. Sin permiso expreso por escrito, no puede copiar, modificar, distribuir o crear obras derivadas." },
      { title: "Descargo de Responsabilidad", content: "Este servicio se proporciona 'tal cual' sin ninguna garantía expresa o implícita. No garantizamos la exactitud, fiabilidad o idoneidad del servicio. Los resultados del análisis EEG son solo para fines educativos y no deben usarse como base para decisiones médicas." },
      { title: "Limitación de Responsabilidad", content: "En ningún caso NeuroAccess ni sus desarrolladores serán responsables de daños indirectos, incidentales, especiales, consecuenciales o punitivos derivados del uso o imposibilidad de uso de este servicio." },
      { title: "Cambios en el Servicio", content: "Nos reservamos el derecho de modificar, suspender o terminar este servicio en cualquier momento sin previo aviso. También podemos actualizar estos términos, y los cambios entrarán en vigor cuando se publiquen en esta página." },
      { title: "Contáctenos", content: "Si tiene alguna pregunta sobre estos términos de servicio, contáctenos a través de la función de retroalimentación del sitio web." },
    ],
    fr: [
      { title: "Description du Service", content: "NeuroAccess est une plateforme d'analyse éducative des données EEG (électroencéphalogramme). Nous fournissons des outils pour vous aider à comprendre et analyser les données EEG, mais notre service ne constitue pas un conseil médical, un diagnostic ou un traitement." },
      { title: "Responsabilités de l'Utilisateur", content: "Vous êtes responsable des données que vous téléchargez sur notre plateforme. Assurez-vous d'avoir le droit de partager ces données et qu'elles ne contiennent pas d'informations de santé sensibles ou protégées (PHI). Nous ne sommes pas responsables de la légalité des données que vous téléchargez." },
      { title: "Utilisations Interdites", content: "Vous ne pouvez pas utiliser notre service pour des activités illégales, y compris mais sans s'y limiter: télécharger des logiciels malveillants, violer la vie privée d'autrui, effectuer des diagnostics médicaux non autorisés, ou violer toute loi ou réglementation applicable." },
      { title: "Propriété Intellectuelle", content: "Tout le contenu, la conception et le code de la plateforme NeuroAccess sont protégés par le droit d'auteur et les lois sur la propriété intellectuelle. Sans autorisation écrite expresse, vous ne pouvez pas copier, modifier, distribuer ou créer des œuvres dérivées." },
      { title: "Clause de Non-Responsabilité", content: "Ce service est fourni 'en l'état' sans aucune garantie expresse ou implicite. Nous ne garantissons pas l'exactitude, la fiabilité ou l'adéquation du service. Les résultats de l'analyse EEG sont uniquement à des fins éducatives et ne doivent pas être utilisés comme base pour des décisions médicales." },
      { title: "Limitation de Responsabilité", content: "En aucun cas NeuroAccess et ses développeurs ne seront responsables de dommages indirects, accessoires, spéciaux, consécutifs ou punitifs découlant de l'utilisation ou de l'impossibilité d'utiliser ce service." },
      { title: "Modifications du Service", content: "Nous nous réservons le droit de modifier, suspendre ou résilier ce service à tout moment sans préavis. Nous pouvons également mettre à jour ces conditions, et les modifications prendront effet dès leur publication sur cette page." },
      { title: "Contactez-Nous", content: "Si vous avez des questions concernant ces conditions de service, contactez-nous via la fonction de retour du site web." },
    ],
    de: [
      { title: "Servicebeschreibung", content: "NeuroAccess ist eine Bildungsplattform für die Analyse von EEG-Daten (Elektroenzephalogramm). Wir bieten Tools, die Ihnen helfen, EEG-Daten zu verstehen und zu analysieren, aber unser Service stellt keine medizinische Beratung, Diagnose oder Behandlung dar." },
      { title: "Benutzerverantwortung", content: "Sie sind für die Daten verantwortlich, die Sie auf unsere Plattform hochladen. Bitte stellen Sie sicher, dass Sie das Recht haben, diese Daten zu teilen, und dass sie keine sensiblen oder geschützten Gesundheitsinformationen (PHI) enthalten. Wir sind nicht für die Rechtmäßigkeit der von Ihnen hochgeladenen Daten verantwortlich." },
      { title: "Verbotene Verwendungen", content: "Sie dürfen unseren Service nicht für illegale Aktivitäten nutzen, einschließlich aber nicht beschränkt auf: Hochladen von Malware, Verletzung der Privatsphäre anderer, Durchführung nicht autorisierter medizinischer Diagnosen oder Verletzung geltender Gesetze und Vorschriften." },
      { title: "Geistiges Eigentum", content: "Alle Inhalte, Designs und Codes der NeuroAccess-Plattform sind durch Urheberrecht und Immaterialgüterrechte geschützt. Ohne ausdrückliche schriftliche Genehmigung dürfen Sie keine Kopien erstellen, ändern, verteilen oder abgeleitete Werke schaffen." },
      { title: "Haftungsausschluss", content: "Dieser Service wird 'wie besehen' ohne ausdrückliche oder stillschweigende Garantie bereitgestellt. Wir garantieren nicht die Richtigkeit, Zuverlässigkeit oder Eignung des Services. EEG-Analyseergebnisse sind nur für Bildungszwecke und sollten nicht als Grundlage für medizinische Entscheidungen verwendet werden." },
      { title: "Haftungsbeschränkung", content: "In keinem Fall haften NeuroAccess und seine Entwickler für indirekte, zufällige, besondere, Folge- oder Strafschäden, die sich aus der Nutzung oder Unmöglichkeit der Nutzung dieses Services ergeben." },
      { title: "Serviceänderungen", content: "Wir behalten uns das Recht vor, diesen Service jederzeit ohne vorherige Ankündigung zu ändern, auszusetzen oder zu beenden. Wir können diese Bedingungen auch aktualisieren, und Änderungen treten mit Veröffentlichung auf dieser Seite in Kraft." },
      { title: "Kontaktieren Sie uns", content: "Wenn Sie Fragen zu diesen Nutzungsbedingungen haben, kontaktieren Sie uns über die Feedback-Funktion der Website." },
    ],
    ko: [
      { title: "서비스 설명", content: "NeuroAccess는 EEG(뇌파) 데이터 교육 분석 플랫폼입니다. EEG 데이터를 이해하고 분석하는 데 도움이 되는 도구를 제공하지만, 당사의 서비스는 의료 조언, 진단 또는 치료를 구성하지 않습니다." },
      { title: "사용자 책임", content: "플랫폼에 업로드하는 데이터에 대한 책임은 사용자에게 있습니다. 데이터를 공유할 권한이 있고 민감하거나 보호된 건강 정보(PHI)가 포함되어 있지 않은지 확인하시기 바랍니다. 업로드한 데이터의 합법성에 대해 당사는 책임을 지지 않습니다." },
      { title: "금지 사항", content: "다음을 포함하되 이에 국한되지 않는 불법 활동에 당사 서비스를 사용할 수 없습니다: 악성코드 업로드, 타인의 개인정보 침해, 무단 의료 진단, 또는 적용 가능한 법률 및 규정 위반." },
      { title: "지식재산", content: "NeuroAccess 플랫폼의 모든 콘텐츠, 디자인, 코드는 저작권 및 지식재산권에 의해 보호됩니다. 명시적인 서면 허가 없이 복사, 수정, 배포 또는 파생작품 생성을 할 수 없습니다." },
      { title: "면책 조항", content: "본 서비스는 어떠한 명시적 또는 묵시적 보증 없이 '있는 그대로' 제공됩니다. 서비스의 정확성, 신뢰성 또는 적합성을 보증하지 않습니다. EEG 분석 결과는 교육 목적만을 위한 것이며 의료 결정의 근거로 사용되어서는 안 됩니다." },
      { title: "책임 제한", content: "어떠한 경우에도 NeuroAccess 및 해당 개발자는 본 서비스의 사용 또는 사용 불가로 인해 발생하는 간접적, 부수적, 특별, 결과적 또는 징벌적 손해에 대해 책임을 지지 않습니다." },
      { title: "서비스 변경", content: "사전 통지 없이 언제든지 본 서비스를 수정, 중단 또는 종료할 권리를 보유합니다. 본 약관도 업데이트할 수 있으며, 변경 사항은 본 페이지에 게시됨과 동시에 효력을 발생합니다." },
      { title: "문의하기", content: "본 서비스 약관에 대해 궁금한 사항이 있으시면 웹사이트 피드백 기능을 통해 문의해 주세요." },
    ],
  };

  const content = (termsSections as any)[lang] || termsSections.en;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t("backToHome") || "Back to Home"}
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
        {t("termsOfService") || "Terms of Service"}
      </h1>
      <p className="mb-8 text-sm text-[var(--color-text-secondary)]">
        {t("lastUpdatedDate") || "Last updated: May 29, 2026"}
      </p>

      <div className="space-y-8">
        {content.map((section: {title: string, content: string}, i: number) => (
          <div key={i}>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-text)]">
              {i + 1}. {section.title}
            </h2>
            <p className="leading-7 text-[var(--color-text-secondary)]">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 border-t border-[var(--color-border)] pt-8 text-center text-sm text-[var(--color-text-secondary)]">
        <p>NeuroAccess &copy; 2026. {(t("allRightsReserved") || "All rights reserved.")}</p>
      </div>
    </div>
  );
}
