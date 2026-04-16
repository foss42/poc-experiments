import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import mongoose from "mongoose"
import { z } from "zod";


// Create server instance
const server = new McpServer({
  name: "mcp-poc",
  version: "1.0.0",
});

const mongouri="mongodb://localhost:27017/poc_apidash"
await mongoose.connect(mongouri)

const schema=new mongoose.Schema({
  username:{type:String,unique:true},
  age:{type:Number},
  name:{type:String}
})
const User = mongoose.model('User', schema);

interface   userSchema{
    name:string,
    age:number,
    username:string
}

async function insertData({ name, age, username }: userSchema) {
  try {
    const user = await User.create({ name, age, username });
    return {
      success: true,
      data: user
    };

  } catch (error: any) {
    if (error.code === 11000) {
      return {
        success: false,
        error: "Username already exists"
      };
    }
    return {
      success: false,
      error: "Database error",
      details: error.message
    };
  }
}

async function deleteUser(_id:string) {
  const user = await User.findOne({_id});

  if (!user) {
    return {
      content: [{ type: "text", text: `User ${_id} not found.` }]
    };
  }

  await User.deleteOne({_id});
  return {
    content: [{ type: "text", text: `User ${_id} deleted successfully.` }]
  };
}

server.registerTool('add-number',{
    description:"add the number",
    inputSchema:{
        a:z.number(),
        b:z.number()
    }
},
async({a,b}):Promise<any>=>{
   const sum=a+b
    return({
      type:"text",
      text:JSON.stringify(sum)
    })
    }
)

server.registerTool('subtract-number',{
  description:"subtract two number",
  inputSchema:({
    a:z.number(),
    b:z.number()
  }),
},
 async({a,b}):Promise<any> => {
    const diff=a-b
    return({
      type:"text",
      text:JSON.stringify(diff)
    }
    )
  })

server.registerTool(
    "insert-user",
    {
        description:"Insert a user in the database",
        inputSchema:{
            name:z.string().nonempty(),
            age:z.number(),
            username:z.string()
        }
    },
    async ({name,age,username}):Promise<any> => {
        const user=await insertData({name,age,username})
        if(!user) return;
        var data=user as userSchema
        if (!data) return;
        return {
            content:[{
                type:'text',
                text:JSON.stringify(data)
            }
            ]
        }
    }
)
server.registerTool("delete-user",
    {
        description:"delete the user from the database having userid or name",
        inputSchema:{
            _id:z.string(),
            name:z.string().optional()
        }
    },
    async({_id,name}):Promise<any>=>{
        const response=await deleteUser(_id)
        return{
            content:[{
                type:"text",
                text:JSON.stringify(response)
            }]
        }
    }
)

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP poc running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});