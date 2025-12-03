import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from 'src/components/ui/card'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import { Input } from 'src/components/ui/input'
import { Label } from 'src/components/ui/label'
import { Switch } from 'src/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from 'src/components/ui/dialog'
import { Progress } from 'src/components/ui/progress'
import { Server, Settings, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react'

interface FlyIOUsage {
  currentMonthCost: number
  forecastedMonthCost: number
  monthlyBudget: number
  isBudgetAlertEnabled: boolean
  budgetAlertThreshold: number
  regions: string[]
  dailyCosts?: Array<{ date: string; cost: number }>
}

// useEvent helper for stable callbacks
function useEvent<T extends (...a: unknown[]) => unknown>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback(((...a) => ref.current(...a)) as T, [])
}

export function FlyIOCostControlsSection() {
  const [usage, setUsage] = useState<FlyIOUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [budget, setBudget] = useState('50')
  const [alertThreshold, setAlertThreshold] = useState('80')
  const [isAlertEnabled, setIsAlertEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchUsage = useEvent(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin?path=flyio-usage')
      if (response.ok) {
        const dataRaw = (await response.json()) as unknown
        // Parse inputs with guards
        if (dataRaw && typeof dataRaw === 'object' && 'monthlyBudget' in dataRaw) {
          const data = dataRaw as FlyIOUsage
          setUsage(data)
          
          const budgetNum = typeof data.monthlyBudget === 'number' ? data.monthlyBudget : Number(data.monthlyBudget)
          const cap = Number.isFinite(budgetNum) ? budgetNum : 0
          setBudget(cap.toString())
          
          const thresholdNum = typeof data.budgetAlertThreshold === 'number' ? data.budgetAlertThreshold : Number(data.budgetAlertThreshold)
          const threshold = Number.isFinite(thresholdNum) ? thresholdNum : 80
          setAlertThreshold(threshold.toString())
          
          setIsAlertEnabled(data.isBudgetAlertEnabled ?? true)
        }
      }
    } catch (error) {
      console.error('Failed to fetch Fly.io usage:', error)
    } finally {
      setLoading(false)
    }
  })

  useEffect(() => {
    void fetchUsage()
  }, [fetchUsage])

  const handleSaveSettings = useEvent(async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin?path=flyio-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyBudget: parseFloat(budget),
          budgetAlertThreshold: parseFloat(alertThreshold),
          isBudgetAlertEnabled: isAlertEnabled,
        }),
      })

      if (response.ok) {
        setIsDialogOpen(false)
        void fetchUsage()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  })

  // Parse inputs with guards
  const monthlyBudget = usage ? (Number.isFinite(usage.monthlyBudget) ? usage.monthlyBudget : 0) : 0
  const currentMonthCost = usage ? (Number.isFinite(usage.currentMonthCost) ? usage.currentMonthCost : 0) : 0
  const forecastedMonthCost = usage ? (Number.isFinite(usage.forecastedMonthCost) ? usage.forecastedMonthCost : 0) : 0
  
  const budgetPercentage = monthlyBudget > 0 ? (currentMonthCost / monthlyBudget) * 100 : 0
  const forecastPercentage = monthlyBudget > 0 ? (forecastedMonthCost / monthlyBudget) * 100 : 0
  const isOverBudget = budgetPercentage >= (usage?.budgetAlertThreshold || 80)
  const isForecastOverBudget = forecastPercentage >= (usage?.budgetAlertThreshold || 80)

  if (loading && !usage) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-6" />
                Fly.io Cost Controls
              </CardTitle>
              <CardDescription>
                Monitor and control infrastructure costs
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { void fetchUsage() }}>
                <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Fly.io Budget Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="budget">Monthly Budget ($)</Label>
                      <Input
                        id="budget"
                        type="number"
                        step="0.01"
                        min="0"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="threshold">Alert Threshold (%)</Label>
                      <Input
                        id="threshold"
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={alertThreshold}
                        onChange={(e) => setAlertThreshold(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Receive alerts when spending reaches this percentage of budget
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="alerts">Enable Budget Alerts</Label>
                      <Switch
                        id="alerts"
                        checked={isAlertEnabled}
                        onCheckedChange={setIsAlertEnabled}
                      />
                    </div>
                    <Button onClick={() => { void handleSaveSettings() }} disabled={saving} className="w-full">
                      {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${currentMonthCost.toFixed(2)}
            </div>
            <div className="mt-2">
              <Progress value={Math.min(budgetPercentage, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {budgetPercentage.toFixed(1)}% of ${monthlyBudget} budget
              </p>
            </div>
            {isOverBudget && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="mr-1 size-3" />
                Over threshold
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecasted</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${forecastedMonthCost.toFixed(2)}
            </div>
            <div className="mt-2">
              <Progress value={Math.min(forecastPercentage, 100)} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {forecastPercentage.toFixed(1)}% of ${monthlyBudget} budget
              </p>
            </div>
            {isForecastOverBudget && (
              <Badge variant="destructive" className="mt-2">
                <AlertTriangle className="mr-1 size-3" />
                Forecast exceeds budget
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Budget</CardTitle>
            <Settings className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${monthlyBudget.toFixed(2)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={usage?.isBudgetAlertEnabled ? 'default' : 'secondary'}>
                {usage?.isBudgetAlertEnabled ? 'Alerts Enabled' : 'Alerts Disabled'}
              </Badge>
              {usage?.isBudgetAlertEnabled && (
                <Badge variant="outline">
                  Alert at {usage.budgetAlertThreshold}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regions */}
      {usage?.regions && usage.regions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Regions</CardTitle>
            <CardDescription>Infrastructure regions in use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {usage.regions.map((region) => (
                <Badge key={region} variant="outline">
                  {region.toUpperCase()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

