import { useTranslation } from 'react-i18next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Check, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  variant?: 'ghost' | 'outline' | 'default'
  size?: 'default' | 'sm' | 'icon'
  showLabel?: boolean
  className?: string
}

export function LanguageSwitcher({
  variant = 'ghost',
  size = 'sm',
  showLabel = true,
  className,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi'

  const languages = [
    { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ]

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('cts_language', langCode)
  }

  const currentObj = languages.find((l) => l.code === currentLang) || languages[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            'flex items-center gap-2 font-medium text-xs md:text-sm h-9 px-2.5 transition-colors',
            className
          )}
          title={currentObj.label}
        >
          <span className="text-base leading-none" role="img" aria-label={currentObj.label}>
            {currentObj.flag}
          </span>
          {showLabel && (
            <span className="hidden sm:inline-block font-medium">
              {currentObj.label}
            </span>
          )}
          {!showLabel && <Globe className="h-4 w-4 hidden" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 min-w-[9rem]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer py-2 px-3 text-xs md:text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{lang.flag}</span>
              <span className={cn(currentLang === lang.code && 'font-semibold text-primary')}>
                {lang.label}
              </span>
            </div>
            {currentLang === lang.code && (
              <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
