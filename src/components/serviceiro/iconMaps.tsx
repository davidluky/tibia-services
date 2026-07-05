import type { ComponentType } from 'react'
import {
  BestiaryIcon,
  BossIcon,
  DruidIcon,
  HuntIcon,
  KnightIcon,
  MonkIcon,
  PaladinIcon,
  QuestIcon,
  ShieldCheckIcon,
  SorcererIcon,
  type FantasyIconProps,
} from '@/components/ui/icons'

export type ServiceiroIcon = ComponentType<FantasyIconProps>

const vocationIcons: Record<string, ServiceiroIcon> = {
  knight: KnightIcon,
  paladin: PaladinIcon,
  sorcerer: SorcererIcon,
  druid: DruidIcon,
  monk: MonkIcon,
}

const gameplayTypeIcons: Record<string, ServiceiroIcon> = {
  hunt_x1: HuntIcon,
  hunt_x2: HuntIcon,
  hunt_x3plus: HuntIcon,
  quests: QuestIcon,
  ks_pk: BossIcon,
  bestiary: BestiaryIcon,
}

export function getVocationIcon(key: string): ServiceiroIcon {
  return vocationIcons[key] ?? ShieldCheckIcon
}

export function getGameplayTypeIcon(key: string): ServiceiroIcon {
  return gameplayTypeIcons[key] ?? HuntIcon
}
