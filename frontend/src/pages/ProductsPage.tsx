import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Package } from 'lucide-react'

export function ProductsPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('products.title')}</h1>
          <p className="text-muted-foreground">
            {t('products.subtitle')}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t('products.addProduct')}
        </Button>
      </div>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>{t('products.noProductsTitle')}</CardTitle>
          <CardDescription>
            {t('products.noProductsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
            {t('products.emptyNotice')}
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('products.addProductBtn')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

