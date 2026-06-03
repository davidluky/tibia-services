# Language Switcher Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-language switcher (🇧🇷 PT / 🇺🇸 EN / 🇪🇸 ES) to the navbar that instantly changes all UI text in client components, with the chosen language persisted in localStorage.

**Architecture:** A `LanguageContext` (React context) provides a `t(key)` translation function to all client components. All translations live in a single `src/lib/i18n.ts` file. A `mounted` guard prevents hydration mismatches by always returning Portuguese strings on the first render.

**Tech Stack:** Next.js 14 App Router, React Context, localStorage, TypeScript, Tailwind CSS

---

## Chunk 1: Foundation — i18n file + context + provider + switcher

### Task 1: Create the translation file `src/lib/i18n.ts`

**Files:**
- Create: `src/lib/i18n.ts`

- [ ] **Step 1: Create `src/lib/i18n.ts` with all translation keys**

```ts
export type Locale = 'pt' | 'en' | 'es'

const translations: Record<Locale, Record<string, string>> = {
  pt: {
    // Navbar
    nav_browse: 'Buscar',
    nav_bookings: 'Reservas',
    nav_dashboard: 'Dashboard',
    nav_logout: 'Sair',
    nav_login: 'Entrar',
    nav_register: 'Cadastrar',

    // Auth — Login
    login_title: 'Entrar',
    login_no_account: 'Não tem conta?',
    login_register_link: 'Cadastre-se',
    login_email_label: 'Email',
    login_email_placeholder: 'seu@email.com',
    login_password_label: 'Senha',
    login_password_placeholder: '••••••••',
    login_submit: 'Entrar',
    login_error: 'Email ou senha incorretos.',

    // Auth — Register
    register_title: 'Criar conta',
    register_has_account: 'Já tem conta?',
    register_login_link: 'Entrar',
    register_role_label: 'Sou um...',
    register_role_customer_title: 'Sou cliente',
    register_role_customer_desc: 'Quero contratar serviceiros para minhas contas.',
    register_role_serviceiro_title: 'Sou serviceiro',
    register_role_serviceiro_desc: 'Ofereço serviços de hunting, quests e mais.',
    register_name_label: 'Nome de exibição',
    register_name_placeholder: 'Seu nome no site',
    register_email_label: 'Email',
    register_password_label: 'Senha',
    register_password_placeholder: 'Mínimo 8 caracteres',
    register_submit: 'Criar conta',
    register_password_error: 'Senha deve ter pelo menos 8 caracteres.',

    // Browse
    browse_title: 'Buscar Serviceiros',
    browse_empty: 'Nenhum serviceiro encontrado com esses filtros.',
    browse_registered_only: 'Somente verificados',

    // ServiceiroCard
    card_registered_badge: '✓ Registrado',

    // ServiceiroFilters
    filter_vocation_label: 'Vocação',
    filter_gameplay_label: 'Tipo de serviço',
    filter_weekday_label: 'Dia disponível',
    filter_all: 'Todos',
    filter_clear: 'Limpar filtros',

    // Dashboard
    dashboard_title: 'Dashboard',
    dashboard_my_bookings: 'Minhas reservas →',
    dashboard_request_verification: 'Solicitar verificação →',
    dashboard_verified_badge: '✓ Sua conta está verificada e exibe o badge Registrado',
    dashboard_profile_section: 'Perfil público',
    dashboard_name_label: 'Nome de exibição',
    dashboard_name_placeholder: 'Seu nome',
    dashboard_bio_label: 'Bio',
    dashboard_bio_placeholder: 'Conte sobre você, sua experiência, especialidades...',
    dashboard_whatsapp_label: 'WhatsApp',
    dashboard_whatsapp_placeholder: '+55 11 99999-9999',
    dashboard_discord_label: 'Discord',
    dashboard_discord_placeholder: 'usuario#1234',
    dashboard_vocations_section: 'Vocações que atende',
    dashboard_gameplay_section: 'Tipos de serviço oferecidos',
    dashboard_availability_section: 'Disponibilidade',
    dashboard_weekdays_label: 'Dias da semana',
    dashboard_time_from_label: 'Horário início',
    dashboard_time_to_label: 'Horário fim',
    dashboard_timezone_label: 'Fuso horário (UTC offset)',
    dashboard_save: 'Salvar alterações',
    dashboard_save_error: 'Erro ao salvar. Tente novamente.',
    dashboard_save_success: '✓ Perfil salvo com sucesso!',

    // Verification — form
    verification_title: 'Solicitar Verificação',
    verification_char_label: 'Nome do seu personagem em Tibia',
    verification_char_placeholder: 'Ex: Myself',
    verification_screenshot_label: 'Screenshot do personagem (in-game)',
    verification_id_label: 'Documento de identidade (frente)',
    verification_id_note: 'Usado apenas para verificação de identidade. Armazenado com segurança.',
    verification_submit: 'Enviar solicitação',
    verification_error_fields: 'Preencha todos os campos.',
    verification_error_send: 'Erro ao enviar solicitação.',
    verification_how_title: 'Como funciona',
    verification_step1: 'Envie um screenshot do seu personagem in-game e um documento de identidade',
    verification_step3: 'Aguarde a revisão (até 48 horas)',
    verification_step4: 'Após aprovação, o badge aparece automaticamente no seu perfil',
    // Verification — existing request view
    verification_page_title: 'Verificação de Conta',
    verification_your_request: 'Sua solicitação',
    verification_status_label: 'Status:',
    verification_char_display_label: 'Personagem:',
    verification_fee_label: 'Taxa paga:',
    verification_fee_yes: '✓ Sim',
    verification_fee_pending: '⏳ Aguardando confirmação',
    verification_admin_notes_label: 'Nota do admin:',
    verification_back: '← Voltar ao dashboard',
    // Verification — status labels
    verification_status_pending: 'Pendente — aguardando revisão',
    verification_status_approved: 'Aprovado ✓',
    verification_status_rejected: 'Rejeitado',
    // Verification — submitted view
    verification_submitted_title: 'Solicitação enviada!',
    verification_submitted_desc: 'Iremos revisar em até 48 horas. Você será notificado no dashboard.',

    // BookingThread
    booking_status_pending: 'Pendente',
    booking_status_active: 'Ativa',
    booking_status_completed: 'Concluída',
    booking_status_declined: 'Recusada',
    booking_status_cancelled: 'Cancelada',
    booking_price_agreed: 'Preço acordado:',
    booking_price_confirmed: '✓ Confirmado',
    booking_label_customer: 'Cliente:',
    booking_label_serviceiro: 'Serviceiro:',
    booking_msg_pending: 'Aguardando o serviceiro aceitar a reserva...',
    booking_msg_empty: 'Nenhuma mensagem ainda. Comece a conversa!',
    booking_msg_placeholder: 'Digite uma mensagem...',
    booking_send: 'Enviar',
    booking_respond_title: 'Responder solicitação',
    booking_accept: '✓ Aceitar',
    booking_decline: '✕ Recusar',
    booking_price_section: 'Preço (TC)',
    booking_price_propose: 'Propor',
    booking_price_proposed: 'Preço proposto:',
    booking_price_confirm: 'Confirmar preço',
    booking_payment_section: 'Pagamento (em-jogo)',
    booking_payment_sent_btn: 'Marquei TC enviado',
    booking_payment_received_btn: 'Marquei TC recebido',
    booking_payment_sent_label: 'Enviado',
    booking_payment_received_label: 'Recebido',
    booking_complete_section: 'Conclusão',
    booking_complete_btn: 'Marcar como concluído',
    booking_cancel: 'Cancelar reserva',

    // BookNowForm
    booknow_service_label: 'Tipo de serviço',
    booknow_submit: 'Fazer Reserva',
    booknow_no_services: 'Este serviceiro não configurou serviços ainda.',
    booknow_price_note: 'O preço será negociado no chat após a reserva.',
    booknow_error: 'Erro ao criar reserva.',

    // ReviewForm
    review_rating_label: 'Sua avaliação',
    review_rating_1: 'Péssimo',
    review_rating_2: 'Ruim',
    review_rating_3: 'Regular',
    review_rating_4: 'Bom',
    review_rating_5: 'Excelente',
    review_no_rating_error: 'Selecione uma avaliação.',
    review_comment_label: 'Comentário (opcional)',
    review_comment_placeholder: 'Como foi a experiência?',
    review_submit: 'Enviar avaliação',
    review_thank_you: 'Obrigado pela avaliação!',
    review_thank_you_desc: 'Sua avaliação ajuda a comunidade.',

    // ReviewCard
    review_anonymous: 'Usuário',

    // Admin
    admin_verify_approve: 'Aprovar',
    admin_verify_reject: 'Rejeitar',
    admin_verify_fee_paid: 'Marcar taxa paga',
    admin_ban_user: 'Banir',
    admin_unban_user: 'Desbanir',
    admin_hide_review: 'Ocultar',
  },

  en: {
    // Navbar
    nav_browse: 'Browse',
    nav_bookings: 'Bookings',
    nav_dashboard: 'Dashboard',
    nav_logout: 'Log out',
    nav_login: 'Log in',
    nav_register: 'Sign up',

    // Auth — Login
    login_title: 'Log in',
    login_no_account: "Don't have an account?",
    login_register_link: 'Sign up',
    login_email_label: 'Email',
    login_email_placeholder: 'your@email.com',
    login_password_label: 'Password',
    login_password_placeholder: '••••••••',
    login_submit: 'Log in',
    login_error: 'Incorrect email or password.',

    // Auth — Register
    register_title: 'Create account',
    register_has_account: 'Already have an account?',
    register_login_link: 'Log in',
    register_role_label: 'I am a...',
    register_role_customer_title: 'Customer',
    register_role_customer_desc: 'I want to hire serviceiros for my accounts.',
    register_role_serviceiro_title: 'Serviceiro',
    register_role_serviceiro_desc: 'I offer hunting, quests and more.',
    register_name_label: 'Display name',
    register_name_placeholder: 'Your name on the site',
    register_email_label: 'Email',
    register_password_label: 'Password',
    register_password_placeholder: 'At least 8 characters',
    register_submit: 'Create account',
    register_password_error: 'Password must be at least 8 characters.',

    // Browse
    browse_title: 'Browse Serviceiros',
    browse_empty: 'No serviceiros found with these filters.',
    browse_registered_only: 'Verified only',

    // ServiceiroCard
    card_registered_badge: '✓ Registered',

    // ServiceiroFilters
    filter_vocation_label: 'Vocation',
    filter_gameplay_label: 'Service type',
    filter_weekday_label: 'Available day',
    filter_all: 'All',
    filter_clear: 'Clear filters',

    // Dashboard
    dashboard_title: 'Dashboard',
    dashboard_my_bookings: 'My bookings →',
    dashboard_request_verification: 'Request verification →',
    dashboard_verified_badge: '✓ Your account is verified and shows the Registered badge',
    dashboard_profile_section: 'Public profile',
    dashboard_name_label: 'Display name',
    dashboard_name_placeholder: 'Your name',
    dashboard_bio_label: 'Bio',
    dashboard_bio_placeholder: 'Tell about yourself, your experience, specialties...',
    dashboard_whatsapp_label: 'WhatsApp',
    dashboard_whatsapp_placeholder: '+1 555 000 0000',
    dashboard_discord_label: 'Discord',
    dashboard_discord_placeholder: 'username#1234',
    dashboard_vocations_section: 'Vocations served',
    dashboard_gameplay_section: 'Service types offered',
    dashboard_availability_section: 'Availability',
    dashboard_weekdays_label: 'Days of the week',
    dashboard_time_from_label: 'Start time',
    dashboard_time_to_label: 'End time',
    dashboard_timezone_label: 'Timezone (UTC offset)',
    dashboard_save: 'Save changes',
    dashboard_save_error: 'Error saving. Please try again.',
    dashboard_save_success: '✓ Profile saved successfully!',

    // Verification — form
    verification_title: 'Request Verification',
    verification_char_label: 'Your character name in Tibia',
    verification_char_placeholder: 'Ex: Myself',
    verification_screenshot_label: 'Character screenshot (in-game)',
    verification_id_label: 'Identity document (front)',
    verification_id_note: 'Used only for identity verification. Stored securely.',
    verification_submit: 'Submit request',
    verification_error_fields: 'Please fill all fields.',
    verification_error_send: 'Error submitting request.',
    verification_how_title: 'How it works',
    verification_step1: 'Submit a screenshot of your in-game character and an identity document',
    verification_step3: 'Await review (up to 48 hours)',
    verification_step4: 'After approval, the badge appears automatically on your profile',
    // Verification — existing request view
    verification_page_title: 'Account Verification',
    verification_your_request: 'Your request',
    verification_status_label: 'Status:',
    verification_char_display_label: 'Character:',
    verification_fee_label: 'Fee paid:',
    verification_fee_yes: '✓ Yes',
    verification_fee_pending: '⏳ Awaiting confirmation',
    verification_admin_notes_label: 'Admin notes:',
    verification_back: '← Back to dashboard',
    // Verification — status labels
    verification_status_pending: 'Pending — awaiting review',
    verification_status_approved: 'Approved ✓',
    verification_status_rejected: 'Rejected',
    // Verification — submitted view
    verification_submitted_title: 'Request submitted!',
    verification_submitted_desc: 'We will review within 48 hours. You will be notified in the dashboard.',

    // BookingThread
    booking_status_pending: 'Pending',
    booking_status_active: 'Active',
    booking_status_completed: 'Completed',
    booking_status_declined: 'Declined',
    booking_status_cancelled: 'Cancelled',
    booking_price_agreed: 'Agreed price:',
    booking_price_confirmed: '✓ Confirmed',
    booking_label_customer: 'Customer:',
    booking_label_serviceiro: 'Serviceiro:',
    booking_msg_pending: 'Waiting for the serviceiro to accept the booking...',
    booking_msg_empty: 'No messages yet. Start the conversation!',
    booking_msg_placeholder: 'Type a message...',
    booking_send: 'Send',
    booking_respond_title: 'Respond to request',
    booking_accept: '✓ Accept',
    booking_decline: '✕ Decline',
    booking_price_section: 'Price (TC)',
    booking_price_propose: 'Propose',
    booking_price_proposed: 'Proposed price:',
    booking_price_confirm: 'Confirm price',
    booking_payment_section: 'Payment (in-game)',
    booking_payment_sent_btn: 'I sent TC',
    booking_payment_received_btn: 'I received TC',
    booking_payment_sent_label: 'Sent',
    booking_payment_received_label: 'Received',
    booking_complete_section: 'Completion',
    booking_complete_btn: 'Mark as complete',
    booking_cancel: 'Cancel booking',

    // BookNowForm
    booknow_service_label: 'Service type',
    booknow_submit: 'Book',
    booknow_no_services: 'This serviceiro has not configured services yet.',
    booknow_price_note: 'The price will be negotiated in chat after booking.',
    booknow_error: 'Error creating booking.',

    // ReviewForm
    review_rating_label: 'Your rating',
    review_rating_1: 'Terrible',
    review_rating_2: 'Bad',
    review_rating_3: 'OK',
    review_rating_4: 'Good',
    review_rating_5: 'Excellent',
    review_no_rating_error: 'Please select a rating.',
    review_comment_label: 'Comment (optional)',
    review_comment_placeholder: 'How was the experience?',
    review_submit: 'Submit review',
    review_thank_you: 'Thank you for your review!',
    review_thank_you_desc: 'Your review helps the community.',

    // ReviewCard
    review_anonymous: 'User',

    // Admin
    admin_verify_approve: 'Approve',
    admin_verify_reject: 'Reject',
    admin_verify_fee_paid: 'Mark fee paid',
    admin_ban_user: 'Ban',
    admin_unban_user: 'Unban',
    admin_hide_review: 'Hide',
  },

  es: {
    // Navbar
    nav_browse: 'Buscar',
    nav_bookings: 'Reservas',
    nav_dashboard: 'Panel',
    nav_logout: 'Salir',
    nav_login: 'Entrar',
    nav_register: 'Registrarse',

    // Auth — Login
    login_title: 'Entrar',
    login_no_account: '¿No tienes cuenta?',
    login_register_link: 'Regístrate',
    login_email_label: 'Correo',
    login_email_placeholder: 'tu@correo.com',
    login_password_label: 'Contraseña',
    login_password_placeholder: '••••••••',
    login_submit: 'Entrar',
    login_error: 'Correo o contraseña incorrectos.',

    // Auth — Register
    register_title: 'Crear cuenta',
    register_has_account: '¿Ya tienes cuenta?',
    register_login_link: 'Entrar',
    register_role_label: 'Soy...',
    register_role_customer_title: 'Cliente',
    register_role_customer_desc: 'Quiero contratar serviceiros para mis cuentas.',
    register_role_serviceiro_title: 'Serviceiro',
    register_role_serviceiro_desc: 'Ofrezco servicios de hunting, quests y más.',
    register_name_label: 'Nombre de perfil',
    register_name_placeholder: 'Tu nombre en el sitio',
    register_email_label: 'Correo',
    register_password_label: 'Contraseña',
    register_password_placeholder: 'Mínimo 8 caracteres',
    register_submit: 'Crear cuenta',
    register_password_error: 'La contraseña debe tener al menos 8 caracteres.',

    // Browse
    browse_title: 'Buscar Serviceiros',
    browse_empty: 'No se encontraron serviceiros con estos filtros.',
    browse_registered_only: 'Solo verificados',

    // ServiceiroCard
    card_registered_badge: '✓ Registrado',

    // ServiceiroFilters
    filter_vocation_label: 'Vocación',
    filter_gameplay_label: 'Tipo de servicio',
    filter_weekday_label: 'Día disponible',
    filter_all: 'Todos',
    filter_clear: 'Limpiar filtros',

    // Dashboard
    dashboard_title: 'Panel',
    dashboard_my_bookings: 'Mis reservas →',
    dashboard_request_verification: 'Solicitar verificación →',
    dashboard_verified_badge: '✓ Tu cuenta está verificada y muestra el badge Registrado',
    dashboard_profile_section: 'Perfil público',
    dashboard_name_label: 'Nombre de perfil',
    dashboard_name_placeholder: 'Tu nombre',
    dashboard_bio_label: 'Bio',
    dashboard_bio_placeholder: 'Cuéntanos sobre ti, tu experiencia, especialidades...',
    dashboard_whatsapp_label: 'WhatsApp',
    dashboard_whatsapp_placeholder: '+54 11 9999-9999',
    dashboard_discord_label: 'Discord',
    dashboard_discord_placeholder: 'usuario#1234',
    dashboard_vocations_section: 'Vocaciones que atiende',
    dashboard_gameplay_section: 'Tipos de servicio ofrecidos',
    dashboard_availability_section: 'Disponibilidad',
    dashboard_weekdays_label: 'Días de la semana',
    dashboard_time_from_label: 'Hora de inicio',
    dashboard_time_to_label: 'Hora de fin',
    dashboard_timezone_label: 'Zona horaria (UTC offset)',
    dashboard_save: 'Guardar cambios',
    dashboard_save_error: 'Error al guardar. Intenta de nuevo.',
    dashboard_save_success: '✓ ¡Perfil guardado exitosamente!',

    // Verification — form
    verification_title: 'Solicitar Verificación',
    verification_char_label: 'Nombre de tu personaje en Tibia',
    verification_char_placeholder: 'Ej: Myself',
    verification_screenshot_label: 'Screenshot del personaje (en el juego)',
    verification_id_label: 'Documento de identidad (frente)',
    verification_id_note: 'Usado solo para verificación de identidad. Almacenado de forma segura.',
    verification_submit: 'Enviar solicitud',
    verification_error_fields: 'Por favor completa todos los campos.',
    verification_error_send: 'Error al enviar la solicitud.',
    verification_how_title: 'Cómo funciona',
    verification_step1: 'Envía un screenshot de tu personaje en el juego y un documento de identidad',
    verification_step3: 'Espera la revisión (hasta 48 horas)',
    verification_step4: 'Tras la aprobación, el badge aparece automáticamente en tu perfil',
    // Verification — existing request view
    verification_page_title: 'Verificación de Cuenta',
    verification_your_request: 'Tu solicitud',
    verification_status_label: 'Estado:',
    verification_char_display_label: 'Personaje:',
    verification_fee_label: 'Cuota pagada:',
    verification_fee_yes: '✓ Sí',
    verification_fee_pending: '⏳ Esperando confirmación',
    verification_admin_notes_label: 'Notas del admin:',
    verification_back: '← Volver al panel',
    // Verification — status labels
    verification_status_pending: 'Pendiente — esperando revisión',
    verification_status_approved: 'Aprobado ✓',
    verification_status_rejected: 'Rechazado',
    // Verification — submitted view
    verification_submitted_title: '¡Solicitud enviada!',
    verification_submitted_desc: 'Revisaremos en 48 horas. Serás notificado en el panel.',

    // BookingThread
    booking_status_pending: 'Pendiente',
    booking_status_active: 'Activa',
    booking_status_completed: 'Completada',
    booking_status_declined: 'Rechazada',
    booking_status_cancelled: 'Cancelada',
    booking_price_agreed: 'Precio acordado:',
    booking_price_confirmed: '✓ Confirmado',
    booking_label_customer: 'Cliente:',
    booking_label_serviceiro: 'Serviceiro:',
    booking_msg_pending: 'Esperando que el serviceiro acepte la reserva...',
    booking_msg_empty: 'Sin mensajes aún. ¡Inicia la conversación!',
    booking_msg_placeholder: 'Escribe un mensaje...',
    booking_send: 'Enviar',
    booking_respond_title: 'Responder solicitud',
    booking_accept: '✓ Aceptar',
    booking_decline: '✕ Rechazar',
    booking_price_section: 'Precio (TC)',
    booking_price_propose: 'Proponer',
    booking_price_proposed: 'Precio propuesto:',
    booking_price_confirm: 'Confirmar precio',
    booking_payment_section: 'Pago (en el juego)',
    booking_payment_sent_btn: 'Marqué TC enviado',
    booking_payment_received_btn: 'Marqué TC recibido',
    booking_payment_sent_label: 'Enviado',
    booking_payment_received_label: 'Recibido',
    booking_complete_section: 'Conclusión',
    booking_complete_btn: 'Marcar como completado',
    booking_cancel: 'Cancelar reserva',

    // BookNowForm
    booknow_service_label: 'Tipo de servicio',
    booknow_submit: 'Reservar',
    booknow_no_services: 'Este serviceiro no ha configurado servicios aún.',
    booknow_price_note: 'El precio se negociará en el chat después de reservar.',
    booknow_error: 'Error al crear la reserva.',

    // ReviewForm
    review_rating_label: 'Tu calificación',
    review_rating_1: 'Terrible',
    review_rating_2: 'Malo',
    review_rating_3: 'Regular',
    review_rating_4: 'Bueno',
    review_rating_5: 'Excelente',
    review_no_rating_error: 'Por favor selecciona una calificación.',
    review_comment_label: 'Comentario (opcional)',
    review_comment_placeholder: '¿Cómo fue la experiencia?',
    review_submit: 'Enviar calificación',
    review_thank_you: '¡Gracias por tu calificación!',
    review_thank_you_desc: 'Tu calificación ayuda a la comunidad.',

    // ReviewCard
    review_anonymous: 'Usuario',

    // Admin
    admin_verify_approve: 'Aprobar',
    admin_verify_reject: 'Rechazar',
    admin_verify_fee_paid: 'Marcar cuota pagada',
    admin_ban_user: 'Banear',
    admin_unban_user: 'Desbanear',
    admin_hide_review: 'Ocultar',
  },
}

export function getTranslation(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations['pt']?.[key] ?? key
}
```

- [ ] **Step 2: Verify file saved correctly** — open `src/lib/i18n.ts` and confirm it has all 3 locales and the `getTranslation` export.

---

### Task 2: Create the language context `src/lib/language-context.tsx`

**Files:**
- Create: `src/lib/language-context.tsx`

- [ ] **Step 1: Create the context file**

```tsx
'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { type Locale, getTranslation } from './i18n'

interface LanguageContextValue {
  lang: Locale
  setLang: (l: Locale) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'pt',
  setLang: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>('pt')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tibia_lang') as Locale | null
      if (saved && ['pt', 'en', 'es'].includes(saved)) setLangState(saved)
    } catch {
      // localStorage unavailable (private browsing) — stay on 'pt'
    }
    setMounted(true)
  }, [])

  const effectiveLang = mounted ? lang : 'pt'

  const setLang = (l: Locale) => {
    setLangState(l)
    try { localStorage.setItem('tibia_lang', l) } catch { /* ignore */ }
  }

  const t = (key: string) => getTranslation(effectiveLang, key)

  return (
    <LanguageContext.Provider value={{ lang: effectiveLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
```

---

### Task 3: Create the Providers wrapper and wire into layout

**Files:**
- Create: `src/components/providers/Providers.tsx` (directory must be created first)
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create the `providers` directory and the wrapper file**

Create directory `src/components/providers/`, then create `src/components/providers/Providers.tsx`:

```tsx
'use client'
import { LanguageProvider } from '@/lib/language-context'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>
}
```

- [ ] **Step 2: Read `src/app/layout.tsx`, then wrap its `{children}` with `<Providers>`**

Add import at the top:
```tsx
import { Providers } from '@/components/providers/Providers'
```

Then find the JSX where `{children}` appears inside `<body>` and wrap it:
```tsx
<Providers>{children}</Providers>
```

---

### Task 4: Create the `LanguageSwitcher` component and add to Navbar

**Files:**
- Create: `src/components/ui/LanguageSwitcher.tsx`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Create `src/components/ui/LanguageSwitcher.tsx`**

```tsx
'use client'
import { useLanguage } from '@/lib/language-context'
import type { Locale } from '@/lib/i18n'

const LANGUAGES: { locale: Locale; flag: string; label: string }[] = [
  { locale: 'pt', flag: '🇧🇷', label: 'PT' },
  { locale: 'en', flag: '🇺🇸', label: 'EN' },
  { locale: 'es', flag: '🇪🇸', label: 'ES' },
]

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex items-center gap-1">
      {LANGUAGES.map(({ locale, flag, label }) => (
        <button
          key={locale}
          onClick={() => setLang(locale)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            lang === locale
              ? 'text-gold underline underline-offset-2 font-semibold'
              : 'text-text-muted hover:text-text-primary'
          }`}
          title={label}
        >
          <span>{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `src/components/layout/Navbar.tsx`**

Add imports at the top:
```tsx
import { useLanguage } from '@/lib/language-context'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'
```

Add `const { t } = useLanguage()` at the top of the `Navbar` component body (alongside the existing `useState` calls).

Replace hardcoded nav strings:
- `Buscar` → `{t('nav_browse')}` (both desktop and mobile)
- `Reservas` → `{t('nav_bookings')}` (both desktop and mobile)
- `Dashboard` (link text) → `{t('nav_dashboard')}` (both desktop and mobile)
- `Sair` → `{t('nav_logout')}` (both desktop and mobile)
- `Entrar` → `{t('nav_login')}` (both desktop and mobile)
- `Cadastrar` → `{t('nav_register')}` (both desktop and mobile)
- `title="Ir para o dashboard"` → `title={t('nav_dashboard')}`

Add `<LanguageSwitcher />` to **desktop nav** — after all the links, before the closing `</div>`, separated by a divider:
```tsx
<span className="border-l border-border pl-4">
  <LanguageSwitcher />
</span>
```

Add `<LanguageSwitcher />` to **mobile menu** — after all mobile links, before the closing `</div>`:
```tsx
<div className="border-t border-border pt-3">
  <LanguageSwitcher />
</div>
```

- [ ] **Step 3: Start the dev server and verify**

Run: `npm run dev`

Open `http://localhost:3000` and confirm:
- Three flags appear on the right side of the navbar separated by a divider
- Clicking 🇺🇸 EN changes navbar text to English immediately
- Clicking 🇪🇸 ES changes navbar text to Spanish
- Clicking 🇧🇷 PT returns to Portuguese
- Refreshing the page keeps the selected language

---

## Chunk 2: Auth + Browse + Dashboard + Booking + Reviews + Verification + Admin

### Task 5: Translate login and register pages

**Files:**
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/auth/register/page.tsx`

- [ ] **Step 1: Update `src/app/auth/login/page.tsx`**

Add import: `import { useLanguage } from '@/lib/language-context'`
Add inside component: `const { t } = useLanguage()`

Replace strings:
- `'Entrar'` (h1) → `{t('login_title')}`
- `'Não tem conta?'` → `{t('login_no_account')}`
- `'Cadastre-se'` → `{t('login_register_link')}`
- `label="Email"` → `label={t('login_email_label')}`
- `placeholder="seu@email.com"` → `placeholder={t('login_email_placeholder')}`
- `label="Senha"` → `label={t('login_password_label')}`
- `'Entrar'` (Button) → `{t('login_submit')}`
- The string `'Email ou senha incorretos.'` set in the handler → `t('login_error')`

- [ ] **Step 2: Update `src/app/auth/register/page.tsx`**

Add import: `import { useLanguage } from '@/lib/language-context'`
Add inside component: `const { t } = useLanguage()`

Move `ROLE_OPTIONS` inside the component (after `const { t } = useLanguage()`) so it can use `t()`:
```tsx
const ROLE_OPTIONS = [
  { value: 'customer', title: t('register_role_customer_title'), description: t('register_role_customer_desc') },
  { value: 'serviceiro', title: t('register_role_serviceiro_title'), description: t('register_role_serviceiro_desc') },
]
```

Replace remaining strings using `register_*` keys. Replace `'Senha deve ter pelo menos 8 caracteres.'` → `t('register_password_error')`.

---

### Task 6: Translate Browse + ServiceiroFilters + ServiceiroCard

**Files:**
- Modify: `src/app/browse/BrowseClient.tsx`
- Modify: `src/components/serviceiro/ServiceiroFilters.tsx`
- Modify: `src/components/serviceiro/ServiceiroCard.tsx`

- [ ] **Step 1: Read all 3 files, then update each**

**`ServiceiroCard.tsx`** — this file has NO `'use client'` directive. You MUST add `'use client'` as the very first line before importing anything, then add `useLanguage`:
```tsx
'use client'
// ... existing imports ...
import { useLanguage } from '@/lib/language-context'
```
Add `const { t } = useLanguage()` inside the component, then replace `'✓ Registrado'` → `{t('card_registered_badge')}`.

**`BrowseClient.tsx`** — add `useLanguage`, replace empty state text and browse title using `browse_*` keys.

**`ServiceiroFilters.tsx`** — add `useLanguage`, replace filter labels using `filter_*` keys.

---

### Task 7: Translate Dashboard

**Files:**
- Modify: `src/app/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add `useLanguage` and replace all strings**

Add import and `const { t } = useLanguage()` at the top of the component body.
Replace every hardcoded string using `dashboard_*` keys. Pay attention to:
- Input `label` props → pass `t('dashboard_name_label')` etc.
- The `textarea` placeholder and label element
- The save button text and success/error messages

---

### Task 8: Translate BookingThread

**Files:**
- Modify: `src/components/booking/BookingThread.tsx`

- [ ] **Step 1: Remove `STATUS_LABELS` constant and replace with `t()` calls**

Delete the `STATUS_LABELS` object (lines 16-22). Where it is used:
```tsx
{STATUS_LABELS[booking.status]}
```
Replace with:
```tsx
{t(`booking_status_${booking.status}`)}
```

- [ ] **Step 2: Add `useLanguage` and replace all other hardcoded strings**

Add `const { t } = useLanguage()` at the top of the component body, then replace all strings using `booking_*` keys.

---

### Task 9: Translate BookNowForm

**Files:**
- Modify: `src/app/serviceiro/[id]/BookNowForm.tsx`

- [ ] **Step 1: Add `useLanguage` and replace strings**

Add import and `const { t } = useLanguage()`.

Replace:
- `'Tipo de serviço'` (label) → `{t('booknow_service_label')}`
- `'Fazer Reserva'` (Button) → `{t('booknow_submit')}`
- `'Este serviceiro não configurou serviços ainda.'` → `{t('booknow_no_services')}`
- `'O preço será negociado no chat após a reserva.'` → `{t('booknow_price_note')}`
- `'Erro ao criar reserva.'` (fallback error in handler) → `t('booknow_error')`

---

### Task 10: Translate ReviewForm and ReviewCard

**Files:**
- Modify: `src/components/review/ReviewForm.tsx`
- Modify: `src/components/review/ReviewCard.tsx`

- [ ] **Step 1: Read `ReviewCard.tsx` — if it has no `'use client'` directive, add it as the first line**

Then add `useLanguage` and replace `'Usuário'` (anonymous user fallback) → `{t('review_anonymous')}`.

- [ ] **Step 2: Update `ReviewForm.tsx`**

Add `const { t } = useLanguage()`. Replace:
- `'Sua avaliação'` (label) → `{t('review_rating_label')}`
- The star descriptor array `['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente'][rating]` →
  ```tsx
  {rating > 0 && <p className="text-xs text-text-muted mt-1">{t(`review_rating_${rating}`)}</p>}
  ```
- `'Comentário (opcional)'` (label) → `{t('review_comment_label')}`
- `placeholder="Como foi a experiência?"` → `placeholder={t('review_comment_placeholder')}`
- `'Enviar avaliação'` (Button) → `{t('review_submit')}`
- `'Selecione uma avaliação.'` (error in handler) → `t('review_no_rating_error')`
- `'Obrigado pela avaliação!'` (submitted state) → `{t('review_thank_you')}`
- `'Sua avaliação ajuda a comunidade.'` → `{t('review_thank_you_desc')}`

---

### Task 11: Translate VerificationClient

**Files:**
- Modify: `src/app/dashboard/verification/VerificationClient.tsx`

- [ ] **Step 1: Add `useLanguage` and replace all strings**

Add import and `const { t } = useLanguage()`.

Replace the `STATUS_LABELS` object with `t()` calls — delete it and where `STATUS_LABELS[existing.status]` is used, replace with:
```tsx
{t(`verification_status_${existing.status}`)}
```

Replace all other strings using `verification_*` keys:
- h1 in existing-request view → `{t('verification_page_title')}`
- `'Sua solicitação'` → `{t('verification_your_request')}`
- `'Status:'` → `{t('verification_status_label')}`
- `'Personagem:'` → `{t('verification_char_display_label')}`
- `'Taxa paga:'` → `{t('verification_fee_label')}`
- `'✓ Sim'` → `{t('verification_fee_yes')}`
- `'⏳ Aguardando confirmação'` → `{t('verification_fee_pending')}`
- `'Nota do admin:'` → `{t('verification_admin_notes_label')}`
- `'← Voltar ao dashboard'` (both instances) → `{t('verification_back')}`
- `'Solicitação enviada!'` (submitted h1) → `{t('verification_submitted_title')}`
- `'Iremos revisar...'` (submitted desc) → `{t('verification_submitted_desc')}`
- h1 in form view → `{t('verification_title')}`
- `'Como funciona'` → `{t('verification_how_title')}`
- The `<ol>` steps → replace step 1, 3, 4 text with `t('verification_step1')` etc. Step 2 has `<strong>` tags — leave it in Portuguese as static content.
- `label="Nome do seu personagem em Tibia"` → `label={t('verification_char_label')}`
- `placeholder="Ex: Myself"` → `placeholder={t('verification_char_placeholder')}`
- `'Screenshot do personagem (in-game)'` → `{t('verification_screenshot_label')}`
- `'Documento de identidade (frente)'` → `{t('verification_id_label')}`
- `'Usado apenas para verificação...'` → `{t('verification_id_note')}`
- `'Preencha todos os campos.'` (error in handler) → `t('verification_error_fields')`
- The fallback `'Erro ao enviar solicitação.'` → `t('verification_error_send')`
- `'Enviar solicitação'` (Button) → `{t('verification_submit')}`

---

### Task 12: Translate Admin action components

**Files:**
- Modify: `src/app/admin/verifications/[id]/VerificationActions.tsx`
- Modify: `src/app/admin/users/UserActions.tsx`
- Modify: `src/app/admin/reviews/HideReviewButton.tsx`

- [ ] **Step 1: Read each file, add `useLanguage`, and replace strings using `admin_*` keys**

For `VerificationActions.tsx`: replace approve/reject/fee-paid button labels.
For `UserActions.tsx`: replace ban/unban button labels.
For `HideReviewButton.tsx`: replace hide button label.

---

### Task 13: Final end-to-end test

- [ ] **Step 1: Test all pages with language switching**

With `npm run dev` running, open `http://localhost:3000`:

1. Click 🇺🇸 EN — navbar switches to English
2. `/auth/login` — shows English labels
3. `/auth/register` — shows English labels and role options
4. `/browse` — shows English filters and empty state
5. `/dashboard` — shows English form labels
6. Refresh — stays in English (localStorage persisted)
7. Click 🇪🇸 ES — everything switches to Spanish
8. Click 🇧🇷 PT — returns to Portuguese
9. Open browser DevTools → Console — no hydration warnings or errors

- [ ] **Step 2: Verify mobile menu**

Resize the browser to mobile width (< 768px). Confirm the hamburger menu shows all language flags at the bottom of the menu.
