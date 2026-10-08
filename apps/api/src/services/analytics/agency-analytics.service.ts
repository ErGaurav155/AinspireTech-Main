import { Types } from "mongoose";
import { connectToDatabase } from "@/config/database.config";
import AgencyClient from "@/models/tenant/AgencyClient.model";
import Workspace from "@/models/tenant/Workspace.model";
import UsageLedger from "@/models/usage/UsageLedger.model";
import UsageCounter from "@/models/usage/UsageCounter.model";
import InstaLeadCollection from "@/models/insta/LeadCollection.model";
import InstagramAiConversation from "@/models/insta/AiConversation.model";
import InstaReplyLog from "@/models/insta/ReplyLog.model";
import WebChatConversation from "@/models/web/WebChatConversation.model";
import MyAppointment from "@/models/MyAppointment.model";
import WhatsAppWorkspace from "@/models/whatsapp/WhatsAppWorkspace.model";

type MetricRow = { _id: Types.ObjectId; [key: string]: unknown };
type ClientMetrics = {
  workspaceId: string;
  name: string;
  tokens: number;
  monthlyTokens: number;
  leads: number;
  conversations: number;
  contacts: number;
  appointments: number;
  services: Record<string, { tokens: number; leads: number; conversations: number; contacts: number; appointments: number }>;
};

const emptyService = () => ({ tokens: 0, leads: 0, conversations: 0, contacts: 0, appointments: 0 });
const number = (value: unknown) => Number(value || 0);

export async function getAgencyAnalytics({ agencyId, from, to }: { agencyId: string; from: Date; to: Date }) {
  await connectToDatabase();
  const agencyObjectId = new Types.ObjectId(agencyId);
  const relationships = await AgencyClient.find({ agencyId: agencyObjectId, status: { $in: ["active", "suspended"] } }, { workspaceId: 1 }).lean();
  const workspaceIds = relationships.map((item) => item.workspaceId);
  const workspaces = await Workspace.find({ _id: { $in: workspaceIds }, status: { $ne: "archived" } }, { name: 1 }).lean();
  const activeIds = workspaces.map((workspace) => workspace._id);
  const dateMatch = { $gte: from, $lt: to };
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [instagramLeads, instagramConversations, instagramContacts, web, webAppointments, whatsapp, usage, monthlyUsage] = await Promise.all([
    InstaLeadCollection.aggregate<MetricRow>([{ $match: { workspaceId: { $in: activeIds }, createdAt: dateMatch } }, { $group: { _id: "$workspaceId", leads: { $sum: 1 } } }]),
    InstagramAiConversation.aggregate<MetricRow>([{ $match: { workspaceId: { $in: activeIds }, createdAt: dateMatch } }, { $group: { _id: "$workspaceId", conversations: { $sum: 1 } } }]),
    InstaReplyLog.aggregate<MetricRow>([
      { $match: { workspaceId: { $in: activeIds }, createdAt: dateMatch, success: true } },
      { $group: { _id: { workspaceId: "$workspaceId", contact: "$commenterUserId" } } },
      { $group: { _id: "$_id.workspaceId", contacts: { $sum: 1 } } },
    ]),
    WebChatConversation.aggregate<MetricRow>([
      { $match: { workspaceId: { $in: activeIds }, createdAt: dateMatch } },
      { $group: {
        _id: "$workspaceId",
        conversations: { $sum: 1 },
        tokens: { $sum: { $ifNull: ["$totalTokensUsed", 0] } },
        contacts: { $sum: { $cond: [{ $or: [{ $ne: [{ $ifNull: ["$customerEmail", ""] }, ""] }, { $ne: [{ $ifNull: ["$customerName", ""] }, ""] }] }, 1, 0] } },
        leads: { $sum: { $cond: [{ $or: [{ $ne: [{ $ifNull: ["$customerEmail", ""] }, ""] }, { $gt: [{ $size: { $ifNull: ["$formData", []] } }, 0] }] }, 1, 0] } },
      } },
    ]),
    MyAppointment.aggregate<MetricRow>([{ $match: { workspaceId: { $in: activeIds }, createdAt: dateMatch } }, { $group: { _id: "$workspaceId", appointments: { $sum: 1 } } }]),
    WhatsAppWorkspace.aggregate<MetricRow>([
      { $match: { workspaceId: { $in: activeIds } } },
      { $project: {
        _id: "$workspaceId",
        leads: { $size: { $filter: {
          input: { $ifNull: ["$contacts", []] },
          as: "item",
          cond: { $and: [{ $gte: ["$$item.createdAt", from] }, { $lt: ["$$item.createdAt", to] }, { $eq: ["$$item.lifecycleStage", "lead"] }] },
        } } },
        contacts: { $size: { $filter: {
          input: { $ifNull: ["$contacts", []] },
          as: "item",
          cond: { $and: [{ $gte: ["$$item.createdAt", from] }, { $lt: ["$$item.createdAt", to] }] },
        } } },
        conversations: { $size: { $filter: {
          input: { $ifNull: ["$conversations", []] },
          as: "item",
          cond: { $and: [{ $gte: ["$$item.createdAt", from] }, { $lt: ["$$item.createdAt", to] }] },
        } } },
        appointments: { $size: { $filter: {
          input: { $ifNull: ["$appointments", []] },
          as: "item",
          cond: { $and: [{ $gte: ["$$item.createdAt", from] }, { $lt: ["$$item.createdAt", to] }, { $ne: ["$$item.status", "cancelled"] }] },
        } } },
      } },
      { $group: {
        _id: "$_id",
        leads: { $sum: "$leads" },
        contacts: { $sum: "$contacts" },
        conversations: { $sum: "$conversations" },
        appointments: { $sum: "$appointments" },
      } },
    ]),
    UsageLedger.aggregate<MetricRow>([
      { $match: { ownerType: "AGENCY", ownerId: agencyObjectId, workspaceId: { $in: activeIds }, metric: "aiTokens", status: "applied", createdAt: dateMatch } },
      { $group: { _id: "$workspaceId", tokens: { $sum: "$amount" } } },
    ]),
    UsageCounter.find({
      ownerType: "AGENCY",
      ownerId: agencyObjectId,
      workspaceId: { $in: activeIds },
      metric: "aiTokens",
      periodStart: monthStart,
      periodEnd: monthEnd,
    }, { workspaceId: 1, used: 1 }).lean(),
  ]);

  const map = (rows: MetricRow[]) => new Map(rows.map((row) => [String(row._id), row]));
  const igLeadMap = map(instagramLeads), igConversationMap = map(instagramConversations), igContactMap = map(instagramContacts);
  const webMap = map(web), webAppointmentMap = map(webAppointments), whatsappMap = map(whatsapp), usageMap = map(usage);
  const monthlyUsageMap = new Map(
    monthlyUsage.map((counter) => [String(counter.workspaceId), number(counter.used)]),
  );

  const clients: ClientMetrics[] = workspaces.map((workspace) => {
    const id = String(workspace._id);
    const wa = whatsappMap.get(id) || { _id: workspace._id };
    const igLeads = instagramLeads.length ? igLeadMap.get(id) : undefined;
    const igConversations = igConversationMap.get(id);
    const igContacts = igContactMap.get(id);
    const website = webMap.get(id) || { _id: workspace._id };
    const ledgerTokens = number(usageMap.get(id)?.tokens);
    const services = {
      whatsapp: { ...emptyService(), leads: number(wa.leads), conversations: number(wa.conversations), contacts: number(wa.contacts), appointments: number(wa.appointments) },
      instagram: { ...emptyService(), leads: number(igLeads?.leads), conversations: number(igConversations?.conversations), contacts: number(igContacts?.contacts) },
      website: { ...emptyService(), tokens: ledgerTokens || number(website.tokens), leads: number(website.leads), conversations: number(website.conversations), contacts: number(website.contacts), appointments: number(webAppointmentMap.get(id)?.appointments) },
    };
    return {
      workspaceId: id,
      name: workspace.name,
      tokens: Object.values(services).reduce((sum, service) => sum + service.tokens, 0),
      monthlyTokens: monthlyUsageMap.get(id) || 0,
      leads: Object.values(services).reduce((sum, service) => sum + service.leads, 0),
      conversations: Object.values(services).reduce((sum, service) => sum + service.conversations, 0),
      contacts: Object.values(services).reduce((sum, service) => sum + service.contacts, 0),
      appointments: Object.values(services).reduce((sum, service) => sum + service.appointments, 0),
      services,
    };
  });
  const totals = clients.reduce((sum, client) => ({ tokens: sum.tokens + client.tokens, leads: sum.leads + client.leads, conversations: sum.conversations + client.conversations, contacts: sum.contacts + client.contacts, appointments: sum.appointments + client.appointments }), { tokens: 0, leads: 0, conversations: 0, contacts: 0, appointments: 0 });
  const monthlyTokens = clients.reduce((sum, client) => sum + client.monthlyTokens, 0);
  return {
    range: { from: from.toISOString(), to: to.toISOString() },
    totals: { ...totals, monthlyTokens, bookingRate: totals.leads ? Number(((totals.appointments / totals.leads) * 100).toFixed(1)) : 0 },
    clients,
    coverage: { tokens: "Tracked usage ledger, with website conversation totals as fallback", workspaceScopedOnly: true },
  };
}
