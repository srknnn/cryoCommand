/**
 * User Schema - defines the user document structure in MongoDB
 * Matches the Prisma User model and FastAPI user document
 */
export interface UserDocument {
  id: string;          // visibleId - UUID
  email: string;
  password: string;    // bcrypt hashed
  name: string;
  role: string;        // admin, operator, viewer
  created_at: string;  // ISO string
}

/**
 * User without password - for responses
 */
export type UserWithoutPassword = Omit<UserDocument, 'password'>;

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: string;
}
