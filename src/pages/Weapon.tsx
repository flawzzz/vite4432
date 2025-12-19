import { useEffect, useState } from "react";

export default function Character() {

    interface Weapon { // data api
        name: string;
        type: string;
        available: string;
        basic_info: string;
        effect: string;
        image: string;
    }

    const [data, setData] = useState<Weapon[] | null>(null);

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/weapon.json");
            const json = await res.json();
            setData(json);
        }
        load();
    }, []);

    if (!data) return <p>loading...</p>;

    // data recieved 
    return (
        <>
            {

                Object.entries(data).map(([index, member]) => (
                    <div key={index} className="w-22">
                        <img src={`/images/weapon/weapon_${member.image}.png`} alt={member.image} />
                        <p>{member.name}</p>
                    </div>
                ))
            }
        </>
    );
}
