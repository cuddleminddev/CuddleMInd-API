import { PrismaClient, UserStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as readline from 'readline'

const prisma = new PrismaClient()

function askQuestion(query: string, hidden = false): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    if (hidden) {
        (rl as any).stdoutMuted = true
            ; (rl as any)._writeToOutput = function (_stringToWrite: string) {
                if ((rl as any).stdoutMuted)
                    (rl as any).output.write("*")
                else
                    (rl as any).output.write(_stringToWrite)
            }
    }

    return new Promise(resolve => {
        rl.question(query, (answer) => {
            rl.close()
            console.log('')
            resolve(answer)
        })
    })
}

async function main() {

    const name = await askQuestion('Enter Admin Name: ')
    const email = await askQuestion('Enter Admin Email: ')
    const plainPassword = await askQuestion('Enter Admin Password: ', true)

    // Ensure admin role exists
    let adminRole = await prisma.role.findUnique({
        where: { name: 'admin' }
    })

    if (!adminRole) {
        adminRole = await prisma.role.create({
            data: { name: 'admin' }
        })
        console.log('Admin role created.')
    } else {
        console.log('Admin role already exists.')
    }

    // Check if admin user exists
    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        console.log('Admin user already exists.')
        return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    // Create admin user
    const adminUser = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword,
            roleId: adminRole.id,
            status: UserStatus.active
        }
    })

    console.log('Admin user created successfully:')
    console.log(adminUser)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())