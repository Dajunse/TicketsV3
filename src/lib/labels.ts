import { ActivityStatus, Priority, Role, TicketOrigin, TicketStatus } from "@prisma/client";

export function roleLabel(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "Administrador";
    case Role.CLIENT:
      return "Cliente";
    default:
      return role;
  }
}

export function activityStatusLabel(status: ActivityStatus) {
  switch (status) {
    case ActivityStatus.PENDING:
      return "Pendiente";
    case ActivityStatus.IN_PROGRESS:
      return "En progreso";
    case ActivityStatus.COMPLETED:
      return "Completada";
    default:
      return status;
  }
}

export function ticketStatusLabel(status: TicketStatus) {
  switch (status) {
    case TicketStatus.OPEN:
      return "Abierto";
    case TicketStatus.IN_PROGRESS:
      return "En proceso";
    case TicketStatus.CLOSED:
      return "Cerrado";
    default:
      return status;
  }
}

export function ticketOriginLabel(origin: TicketOrigin) {
  switch (origin) {
    case TicketOrigin.AUTHENTICATED:
      return "Portal privado";
    case TicketOrigin.PUBLIC_LINK:
      return "URL publica";
    default:
      return origin;
  }
}

export function priorityLabel(priority: Priority) {
  switch (priority) {
    case Priority.LOW:
      return "Baja";
    case Priority.MEDIUM:
      return "Media";
    case Priority.HIGH:
      return "Alta";
    case Priority.URGENT:
      return "Urgente";
    default:
      return priority;
  }
}
