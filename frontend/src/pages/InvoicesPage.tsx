import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'

export function InvoicesPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('invoices.title')}</h1>
          <p className="text-muted-foreground">
            {t('invoices.subtitle')}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('invoices.newInvoice')}
        </Button>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invoices.noInvoicesTitle')}</CardTitle>
          <CardDescription>
            {t('invoices.noInvoicesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <FileText className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            {t('invoices.emptyNotice')}
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('invoices.createInvoiceBtn')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

