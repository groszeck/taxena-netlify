const client = createClient({
  connectionString: process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be defined");
}

class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

function isISODate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);
}

const contractCreateSchema = z.object({
  name: z.string().min(1),
  details: z.string().optional(),
  startDate: z.string().refine(isISODate, { message: "startDate must be ISO 8601" }),
  endDate: z.string().refine(isISODate, { message: "endDate must be ISO 8601" }),
  value: z.number().nonnegative().optional(),
});

const contractUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    details: z.string().optional(),
    startDate: z.string().refine(isISODate, { message: "startDate must be ISO 8601" }).optional(),
    endDate: z.string().refine(isISODate, { message: "endDate must be ISO 8601" }).optional(),
    value: z.number().nonnegative().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No valid fields to update",
  });

async function authenticate(event: any) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or invalid Authorization header");
  }
  const token = authHeader.split(" ")[1];
  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    throw new HttpError(401, "Invalid token");
  }
  if (!payload.companyId || !payload.userId) {
    throw new HttpError(401, "Invalid token payload");
  }
  return { companyId: payload.companyId, userId: payload.userId };
}

export async function getContracts(event: any): Promise<any> {
  try {
    const { companyId } = await authenticate(event);
    const { rows } = await client.query(
      "SELECT * FROM contracts WHERE company_id = $1 ORDER BY created_at DESC",
      [companyId]
    );
    return {
      statusCode: 200,
      body: JSON.stringify(rows),
    };
  } catch (error: any) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error.message || "Internal Server Error";
    return {
      statusCode,
      body: JSON.stringify({ error: message }),
    };
  }
}

export async function createContract(event: any): Promise<any> {
  try {
    const { companyId, userId } = await authenticate(event);
    if (!event.body) {
      throw new HttpError(400, "Request body is required");
    }
    const data = JSON.parse(event.body);
    const parsed = contractCreateSchema.safeParse(data);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.errors.map((e) => e.message).join("; "));
    }
    const { name, details, startDate, endDate, value } = parsed.data;
    const id = uuidv4();
    const now = new Date().toISOString();
    await client.query(
      `INSERT INTO contracts
        (id, company_id, name, details, start_date, end_date, value, created_at, updated_at, created_by, updated_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [id, companyId, name, details ?? null, startDate, endDate, value ?? null, now, now, userId, userId]
    );
    const { rows } = await client.query("SELECT * FROM contracts WHERE id = $1", [id]);
    return {
      statusCode: 201,
      body: JSON.stringify(rows[0]),
    };
  } catch (error: any) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error.message || "Internal Server Error";
    return {
      statusCode,
      body: JSON.stringify({ error: message }),
    };
  }
}

export async function updateContract(event: any): Promise<any> {
  try {
    const { companyId, userId } = await authenticate(event);
    const id = event.pathParameters?.id;
    if (!id) {
      throw new HttpError(400, "Missing contract ID");
    }
    if (!event.body) {
      throw new HttpError(400, "Request body is required");
    }
    const data = JSON.parse(event.body);
    const parsed = contractUpdateSchema.safeParse(data);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.errors.map((e) => e.message).join("; "));
    }
    const updateData = parsed.data;
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (updateData.name !== undefined) {
      sets.push(`name = $${idx}`);
      values.push(updateData.name);
      idx++;
    }
    if (updateData.details !== undefined) {
      sets.push(`details = $${idx}`);
      values.push(updateData.details);
      idx++;
    }
    if (updateData.startDate !== undefined) {
      sets.push(`start_date = $${idx}`);
      values.push(updateData.startDate);
      idx++;
    }
    if (updateData.endDate !== undefined) {
      sets.push(`end_date = $${idx}`);
      values.push(updateData.endDate);
      idx++;
    }
    if (updateData.value !== undefined) {
      sets.push(`value = $${idx}`);
      values.push(updateData.value);
      idx++;
    }
    // updated_at
    sets.push(`updated_at = $${idx}`);
    values.push(new Date().toISOString());
    idx++;
    // updated_by
    sets.push(`updated_by = $${idx}`);
    values.push(userId);
    idx++;
    // id and company
    const idPlaceholder = `$${idx}`;
    values.push(id);
    idx++;
    const companyPlaceholder = `$${idx}`;
    values.push(companyId);
    const query = `
      UPDATE contracts
      SET ${sets.join(", ")}
      WHERE id = ${idPlaceholder} AND company_id = ${companyPlaceholder}
      RETURNING *`;
    const { rows } = await client.query(query, values);
    if (rows.length === 0) {
      throw new HttpError(404, "Contract not found");
    }
    return {
      statusCode: 200,
      body: JSON.stringify(rows[0]),
    };
  } catch (error: any) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error.message || "Internal Server Error";
    return {
      statusCode,
      body: JSON.stringify({ error: message }),
    };
  }
}

export async function deleteContract(event: any): Promise<any> {
  try {
    const { companyId } = await authenticate(event);
    const id = event.pathParameters?.id;
    if (!id) {
      throw new HttpError(400, "Missing contract ID");
    }
    const result = await client.query(
      "DELETE FROM contracts WHERE id = $1 AND company_id = $2",
      [id, companyId]
    );
    if (result.rowCount === 0) {
      throw new HttpError(404, "Contract not found");
    }
    return {
      statusCode: 204,
      body: "",
    };
  } catch (error: any) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const message = error.message || "Internal Server Error";
    return {
      statusCode,
      body: JSON.stringify({ error: message }),
    };
  }
}