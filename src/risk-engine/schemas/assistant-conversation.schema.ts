/**
 * Assistant Conversation Schema - defines the assistant conversation document structure in MongoDB
 */
export interface AssistantConversationDocument {
  id: string;           // visibleId - UUID
  user_id: string;
  question: string;
  answer: string;
  created_at: string;   // ISO string
}
