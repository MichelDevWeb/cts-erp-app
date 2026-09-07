import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ShoppingCart } from 'lucide-react'

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link to="/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('orders.title')} - {t('common.details')}</h1>
          <p className="text-muted-foreground">
            ID: {id}
          </p>
        </div>
      </div>

      {/* Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>{t('common.details')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {t('orders.emptyNotice')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

