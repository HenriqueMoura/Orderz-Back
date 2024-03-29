import { faker } from '@faker-js/faker'
import Mail from '@ioc:Adonis/Addons/Mail'
import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Database from '@ioc:Adonis/Lucid/Database'
import { User, UserKey } from 'App/Models'
import { StoreValidator, UpdateValidator } from 'App/Validators/User/Register'

export default class UserRegistersController {
  public async store({ request }: HttpContextContract) {
    await Database.transaction(async (trx) => {
      const { email, name, genre, redirectUrl } = await request.validate(StoreValidator)

      const user = new User()
      user.useTransaction(trx)
      user.email = email
      user.name = name
      user.genre = genre

      await user.save()

      const key = faker.datatype.uuid() + new Date().getTime()
      user.related('key').create({ key })

      const link = `${redirectUrl.replace(/\/$/, '')}/${key}`

      await Mail.send((menssage) => {
        menssage.to(email)
        menssage.from('contato@teste.com', 'teste')
        menssage.subject('Criação de conta')
        menssage.htmlView('emails/register', { link })
      })
    })
  }

  public async show({ params }: HttpContextContract) {
    const userKey = await UserKey.findByOrFail('key', params.key)
    await userKey.load('user')
    return userKey.user
  }

  public async update({ request, response }: HttpContextContract) {
    const { key, name, password, cpf, rg, birthDate, phone } = await request.validate(
      UpdateValidator
    )

    const CPF = cpf.replace(/\D/g, '')
    const RG = rg.replace(/\D/g, '')
    const userKey = await UserKey.findByOrFail('key', key)
    const user = await userKey.related('user').query().firstOrFail()
    const username = name.split(' ')[0].toLocaleLowerCase() + new Date().getTime()

    user.merge({ name, password, username, CPF, RG, birthDate, phone })

    await user.save()
    await userKey.delete()

    return response.ok({ menssage: 'ok' })
  }
}
