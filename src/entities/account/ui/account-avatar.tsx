import { UserRound } from "lucide-react"
import { Avatar, AvatarFallback } from "@/shared/ui/avatar"

export function AccountAvatar({ user }: { user: string }) {
  const name = user.split("#", 1)[0]?.trim() ?? ""
  const initials = Array.from(name).slice(0, 2).join("").toLocaleUpperCase("pt-BR")

  return (
    <Avatar size="sm" aria-hidden="true">
      <AvatarFallback>
        {initials || <UserRound data-icon="inline-start" />}
      </AvatarFallback>
    </Avatar>
  )
}
